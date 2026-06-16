import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { POST as login } from "../app/api/auth/login/route";
import { POST as logout } from "../app/api/auth/logout/route";
import { POST as register } from "../app/api/auth/register/route";
import { GET as me } from "../app/api/me/route";
import { DELETE as deleteTrade, PATCH as updateTrade } from "../app/api/trades/[id]/route";
import { GET as listTrades, POST as createTrade } from "../app/api/trades/route";
import { hashPassword, verifyPassword } from "../lib/password";
import { sessionCookieName, tokenHash } from "../lib/auth";

const dbPath = "prisma/auth-test.db";
const prisma = new PrismaClient();

function jsonRequest(url: string, body?: unknown, cookie?: string, method?: string) {
  return new Request(url, {
    method: method ?? (body === undefined ? "GET" : "POST"),
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(cookie ? { cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function cookieFrom(response: Response) {
  const cookie = response.headers.get("set-cookie");
  assert.ok(cookie, "expected a set-cookie header");
  assert.match(cookie, /HttpOnly/i);
  return cookie.split(";")[0];
}

function cookieValue(cookie: string) {
  const [, value] = cookie.split("=");
  assert.ok(value, "expected cookie value");
  return value;
}

async function resetDb() {
  await prisma.tradeExecution.deleteMany();
  await prisma.authSession.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.user.deleteMany();
}

async function createUser(email: string, name: string) {
  return prisma.user.create({
    data: {
      id: randomUUID(),
      email,
      displayName: name,
      passwordHash: await hashPassword("password123"),
    },
  });
}

async function run() {
  await resetDb();

  const first = await createUser("first@example.com", "First User");
  const second = await createUser("second@example.com", "Second User");
  const firstTrade = await prisma.trade.create({
    data: {
      userId: first.id,
      tradeDate: new Date("2026-06-10T10:00:00.000Z"),
      assetClass: "Stock",
      symbol: "AAPL",
      side: "LONG",
      quantity: 10,
      entryPrice: "100",
      fees: "0",
      status: "OPEN",
    },
  });
  await prisma.trade.create({
    data: {
      userId: second.id,
      tradeDate: new Date("2026-06-10T11:00:00.000Z"),
      assetClass: "Stock",
      symbol: "MSFT",
      side: "LONG",
      quantity: 5,
      entryPrice: "200",
      fees: "0",
      status: "OPEN",
    },
  });

  const badLogin = await login(
    jsonRequest("http://test.local/api/auth/login", {
      email: first.email,
      password: "wrong-password",
    }),
  );
  assert.equal(badLogin.status, 401);
  assert.deepEqual(await badLogin.json(), { error: "Invalid email or password." });

  const loginResponse = await login(
    jsonRequest("http://test.local/api/auth/login", {
      email: first.email,
      password: "password123",
    }),
  );
  assert.equal(loginResponse.status, 200);
  const firstCookie = cookieFrom(loginResponse);
  const firstSessionHash = tokenHash(cookieValue(firstCookie));
  assert.equal(
    await prisma.authSession.count({ where: { tokenHash: firstSessionHash } }),
    1,
  );

  const meResponse = await me(jsonRequest("http://test.local/api/me", undefined, firstCookie));
  assert.equal(meResponse.status, 200);
  assert.equal((await meResponse.json()).user.email, first.email);

  const tradesResponse = await listTrades(
    jsonRequest("http://test.local/api/trades", undefined, firstCookie),
  );
  assert.equal(tradesResponse.status, 200);
  const tradesBody = await tradesResponse.json();
  assert.deepEqual(
    tradesBody.trades.map((trade: { symbol: string }) => trade.symbol),
    ["AAPL"],
  );
  assert.equal(tradesBody.trades[0].returnAmount, null);

  const createResponse = await createTrade(
    jsonRequest(
      "http://test.local/api/trades",
      {
        assetClass: "Stock",
        symbol: "nvda",
        side: "LONG",
        quantity: 2,
        entryDateTime: "2026-06-10T12:00:00.000Z",
        entryPrice: 100,
        exitDateTime: null,
        exitPrice: null,
        fees: 1,
        status: "OPEN",
      },
      firstCookie,
    ),
  );
  assert.equal(createResponse.status, 201);
  const createdTrade = (await createResponse.json()).trade;
  assert.equal(createdTrade.symbol, "NVDA");
  assert.equal(createdTrade.returnAmount, null);

  const closeResponse = await updateTrade(
    jsonRequest(
      `http://test.local/api/trades/${createdTrade.id}`,
      {
        exitDateTime: "2026-06-10T13:00:00.000Z",
        exitPrice: 112,
        fees: 4,
        status: "CLOSED",
      },
      firstCookie,
      "PATCH",
    ),
    { params: Promise.resolve({ id: createdTrade.id }) },
  );
  assert.equal(closeResponse.status, 200);
  const closedTrade = (await closeResponse.json()).trade;
  assert.equal(closedTrade.returnAmount, 20);
  assert.equal(closedTrade.returnPercent, 10);
  assert.equal(
    Number(
      (await prisma.trade.findUniqueOrThrow({ where: { id: createdTrade.id } }))
        .grossPnl,
    ),
    20,
  );

  const secondLoginResponse = await login(
    jsonRequest("http://test.local/api/auth/login", {
      email: second.email,
      password: "password123",
    }),
  );
  const secondCookie = cookieFrom(secondLoginResponse);
  const crossUserPatch = await updateTrade(
    jsonRequest(
      `http://test.local/api/trades/${firstTrade.id}`,
      { symbol: "TSLA" },
      secondCookie,
      "PATCH",
    ),
    { params: Promise.resolve({ id: firstTrade.id }) },
  );
  assert.equal(crossUserPatch.status, 404);
  assert.equal(
    (await prisma.trade.findUniqueOrThrow({ where: { id: firstTrade.id } })).symbol,
    "AAPL",
  );

  const crossUserDelete = await deleteTrade(
    jsonRequest(
      `http://test.local/api/trades/${firstTrade.id}`,
      undefined,
      secondCookie,
      "DELETE",
    ),
    { params: Promise.resolve({ id: firstTrade.id }) },
  );
  assert.equal(crossUserDelete.status, 404);

  const ownDelete = await deleteTrade(
    jsonRequest(
      `http://test.local/api/trades/${createdTrade.id}`,
      undefined,
      firstCookie,
      "DELETE",
    ),
    { params: Promise.resolve({ id: createdTrade.id }) },
  );
  assert.equal(ownDelete.status, 204);
  assert.equal(await prisma.trade.findUnique({ where: { id: createdTrade.id } }), null);

  const registerResponse = await register(
    jsonRequest("http://test.local/api/auth/register", {
      name: "New Trader",
      email: "new@example.com",
      password: "password123",
    }),
  );
  assert.equal(registerResponse.status, 200);
  const newUser = await prisma.user.findUniqueOrThrow({
    where: { email: "new@example.com" },
  });
  assert.notEqual(newUser.passwordHash, "password123");
  assert.equal(await verifyPassword("password123", newUser.passwordHash), true);
  cookieFrom(registerResponse);

  const logoutResponse = await logout(
    jsonRequest("http://test.local/api/auth/logout", undefined, firstCookie),
  );
  assert.equal(logoutResponse.status, 200);
  const logoutCookie = logoutResponse.headers.get("set-cookie");
  assert.ok(logoutCookie, "expected logout to expire the session cookie");
  assert.match(logoutCookie, new RegExp(`${sessionCookieName}=;`));
  assert.match(logoutCookie, /Expires=Thu, 01 Jan 1970/i);
  assert.match(logoutCookie, /HttpOnly/i);
  assert.equal(
    await prisma.authSession.count({ where: { tokenHash: firstSessionHash } }),
    0,
  );

  const afterLogout = await me(
    jsonRequest("http://test.local/api/me", undefined, firstCookie),
  );
  assert.equal(afterLogout.status, 401);

  const tradesAfterLogout = await listTrades(
    jsonRequest("http://test.local/api/trades", undefined, firstCookie),
  );
  assert.equal(tradesAfterLogout.status, 401);
}

run()
  .finally(async () => {
    await prisma.$disconnect();
    await unlink(dbPath).catch(() => undefined);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
