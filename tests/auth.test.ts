import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { POST as login } from "../app/api/auth/login/route";
import { POST as logout } from "../app/api/auth/logout/route";
import { POST as register } from "../app/api/auth/register/route";
import { GET as me } from "../app/api/me/route";
import { PATCH as updateTrade } from "../app/api/trades/[id]/route";
import { GET as listTrades } from "../app/api/trades/route";
import { hashPassword, verifyPassword } from "../lib/password";

const dbPath = "prisma/auth-test.db";
const prisma = new PrismaClient();

function jsonRequest(url: string, body?: unknown, cookie?: string) {
  return new Request(url, {
    method: body === undefined ? "GET" : "POST",
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

async function resetDb() {
  await prisma.authSession.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.tradeSetup.deleteMany();
  await prisma.journalSession.deleteMany();
  await prisma.dayNote.deleteMany();
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
      symbol: "AAPL",
      side: "LONG",
      quantity: 10,
      entryPrice: "100",
      notes: "first user trade",
    },
  });
  await prisma.trade.create({
    data: {
      userId: second.id,
      tradeDate: new Date("2026-06-10T11:00:00.000Z"),
      symbol: "MSFT",
      side: "LONG",
      quantity: 5,
      entryPrice: "200",
      notes: "second user trade",
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
      { notes: "modified by second user" },
      secondCookie,
    ),
    { params: Promise.resolve({ id: firstTrade.id }) },
  );
  assert.equal(crossUserPatch.status, 404);
  assert.equal(
    (await prisma.trade.findUniqueOrThrow({ where: { id: firstTrade.id } })).notes,
    "first user trade",
  );

  const ownPatch = await updateTrade(
    jsonRequest(
      `http://test.local/api/trades/${firstTrade.id}`,
      { notes: "modified by owner" },
      firstCookie,
    ),
    { params: Promise.resolve({ id: firstTrade.id }) },
  );
  assert.equal(ownPatch.status, 200);
  assert.equal(
    (await prisma.trade.findUniqueOrThrow({ where: { id: firstTrade.id } })).notes,
    "modified by owner",
  );

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
  const afterLogout = await me(
    jsonRequest("http://test.local/api/me", undefined, firstCookie),
  );
  assert.equal(afterLogout.status, 401);
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
