import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { PATCH as updateTrade } from "../app/api/trades/[id]/route";
import { POST as createTrade } from "../app/api/trades/route";
import { createSession, sessionCookieName } from "../lib/auth";
import { hashPassword } from "../lib/password";

const dbPath = "prisma/trades-test.db";
const prisma = new PrismaClient();

function jsonRequest(url: string, body: unknown, cookie: string, method = "POST") {
  return new Request(url, {
    method,
    headers: {
      "content-type": "application/json",
      cookie,
    },
    body: JSON.stringify(body),
  });
}

function sessionCookie(token: string) {
  return `${sessionCookieName}=${token}`;
}

async function resetDb() {
  await prisma.tradeExecution.deleteMany();
  await prisma.authSession.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.user.deleteMany();
}

async function createUser(email: string) {
  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      email,
      displayName: email.split("@")[0],
      passwordHash: await hashPassword("password123"),
    },
  });
  const session = await createSession(user.id);
  return { user, cookie: sessionCookie(session.token) };
}

async function run() {
  await resetDb();

  const first = await createUser("trades-first@example.com");
  const second = await createUser("trades-second@example.com");

  const partialResponse = await createTrade(
    jsonRequest(
      "http://test.local/api/trades",
      {
        assetClass: "Stock",
        symbol: "aapl",
        side: "LONG",
        quantity: 150,
        entryDateTime: "2026-06-10T14:00:00.000Z",
        entryPrice: 10.67,
        fees: 0,
        status: "OPEN",
        executions: [
          {
            action: "BUY",
            executedAt: "2026-06-10T14:00:00.000Z",
            quantity: 100,
            price: 10,
            fees: 0,
          },
          {
            action: "BUY",
            executedAt: "2026-06-10T14:30:00.000Z",
            quantity: 50,
            price: 12,
            fees: 0,
          },
          {
            action: "SELL",
            executedAt: "2026-06-10T15:00:00.000Z",
            quantity: 80,
            price: 15,
            fees: 0,
          },
        ],
      },
      first.cookie,
    ),
  );

  assert.equal(partialResponse.status, 201);
  const partialTrade = (await partialResponse.json()).trade;
  assert.equal(partialTrade.symbol, "AAPL");
  assert.equal(partialTrade.status, "OPEN");
  assert.equal(partialTrade.quantity, 150);
  assert.equal(partialTrade.remainingQuantity, 70);
  assert.equal(partialTrade.returnAmount, 346.67);
  assert.equal(partialTrade.executions.length, 3);

  const storedPartial = await prisma.trade.findUniqueOrThrow({
    where: { id: partialTrade.id },
  });
  assert.equal(storedPartial.status, "OPEN");
  assert.equal(Number(storedPartial.grossPnl), 346.67);

  const crossUserPatch = await updateTrade(
    jsonRequest(
      `http://test.local/api/trades/${partialTrade.id}`,
      {
        executions: [
          {
            action: "SELL",
            executedAt: "2026-06-10T16:00:00.000Z",
            quantity: 150,
            price: 1,
            fees: 0,
          },
        ],
      },
      second.cookie,
      "PATCH",
    ),
    { params: Promise.resolve({ id: partialTrade.id }) },
  );
  assert.equal(crossUserPatch.status, 404);
  assert.equal(
    await prisma.tradeExecution.count({ where: { tradeId: partialTrade.id } }),
    3,
  );

  const fullExitResponse = await updateTrade(
    jsonRequest(
      `http://test.local/api/trades/${partialTrade.id}`,
      {
        executions: [
          ...partialTrade.executions,
          {
            action: "SELL",
            executedAt: "2026-06-10T16:00:00.000Z",
            quantity: 70,
            price: 16,
            fees: 0,
          },
        ],
      },
      first.cookie,
      "PATCH",
    ),
    { params: Promise.resolve({ id: partialTrade.id }) },
  );

  assert.equal(fullExitResponse.status, 200);
  const fullExitTrade = (await fullExitResponse.json()).trade;
  assert.equal(fullExitTrade.status, "CLOSED");
  assert.equal(fullExitTrade.remainingQuantity, 0);
  assert.equal(fullExitTrade.returnAmount, 720);
  assert.equal(fullExitTrade.exitPrice, 16);
  assert.equal(fullExitTrade.exitDateTime, "2026-06-10T16:00:00.000Z");

  const shortResponse = await createTrade(
    jsonRequest(
      "http://test.local/api/trades",
      {
        assetClass: "Stock",
        symbol: "tsla",
        side: "SHORT",
        quantity: 10,
        entryDateTime: "2026-06-11T14:00:00.000Z",
        entryPrice: 100,
        fees: 0,
        status: "OPEN",
        executions: [
          {
            action: "SELL",
            executedAt: "2026-06-11T14:00:00.000Z",
            quantity: 10,
            price: 100,
            fees: 0,
          },
          {
            action: "BUY",
            executedAt: "2026-06-11T15:00:00.000Z",
            quantity: 4,
            price: 90,
            fees: 0,
          },
        ],
      },
      first.cookie,
    ),
  );

  assert.equal(shortResponse.status, 201);
  const shortTrade = (await shortResponse.json()).trade;
  assert.equal(shortTrade.status, "OPEN");
  assert.equal(shortTrade.remainingQuantity, 6);
  assert.equal(shortTrade.returnAmount, 40);
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
