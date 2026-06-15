import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { calculateTradeStats, getStatsForUser } from "../lib/stats";
import { hashPassword } from "../lib/password";

const dbPath = "prisma/stats-test.db";
const prisma = new PrismaClient();

async function resetDb() {
  await prisma.tradeExecution.deleteMany();
  await prisma.authSession.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.user.deleteMany();
}

async function createUser(email: string) {
  return prisma.user.create({
    data: {
      id: randomUUID(),
      email,
      displayName: email.split("@")[0],
      passwordHash: await hashPassword("password123"),
    },
  });
}

async function run() {
  await resetDb();

  const first = await createUser("stats-first@example.com");
  const second = await createUser("stats-second@example.com");

  await prisma.trade.createMany({
    data: [
      {
        id: "stats-win-1",
        userId: first.id,
        tradeDate: new Date("2026-06-08T14:00:00.000Z"),
        exitDate: new Date("2026-06-08T15:30:00.000Z"),
        assetClass: "Stock",
        symbol: "AAPL",
        side: "LONG",
        quantity: 10,
        entryPrice: "100",
        exitPrice: "110",
        fees: "0",
        status: "CLOSED",
        grossPnl: "100.00",
      },
      {
        id: "stats-loss-1",
        userId: first.id,
        tradeDate: new Date("2026-06-08T16:00:00.000Z"),
        exitDate: new Date("2026-06-08T16:30:00.000Z"),
        assetClass: "Stock",
        symbol: "MSFT",
        side: "LONG",
        quantity: 4,
        entryPrice: "100",
        exitPrice: "90",
        fees: "0",
        status: "CLOSED",
        grossPnl: "-40.00",
      },
      {
        id: "stats-win-2",
        userId: first.id,
        tradeDate: new Date("2026-06-09T14:00:00.000Z"),
        exitDate: new Date("2026-06-09T15:00:00.000Z"),
        assetClass: "Stock",
        symbol: "NVDA",
        side: "LONG",
        quantity: 7,
        entryPrice: "100",
        exitPrice: "110",
        fees: "0",
        status: "CLOSED",
        grossPnl: "70.00",
      },
      {
        id: "stats-open-1",
        userId: first.id,
        tradeDate: new Date("2026-06-10T14:00:00.000Z"),
        assetClass: "Stock",
        symbol: "TSLA",
        side: "LONG",
        quantity: 1,
        entryPrice: "100",
        fees: "0",
        status: "OPEN",
      },
      {
        id: "stats-other-user",
        userId: second.id,
        tradeDate: new Date("2026-06-08T14:00:00.000Z"),
        exitDate: new Date("2026-06-08T15:00:00.000Z"),
        assetClass: "Stock",
        symbol: "META",
        side: "LONG",
        quantity: 1,
        entryPrice: "100",
        exitPrice: "1100",
        fees: "0",
        status: "CLOSED",
        grossPnl: "1000.00",
      },
    ],
  });

  const allStats = await getStatsForUser(first.id);
  assert.deepEqual(allStats.stats, {
    totalTrades: 4,
    closedTrades: 3,
    openTrades: 1,
    winRate: 66.67,
    profitFactor: 4.25,
    averagePnl: 43.33,
    averageWin: 85,
    averageLoss: -40,
    bestTrade: { symbol: "AAPL", pnl: 100 },
    worstTrade: { symbol: "MSFT", pnl: -40 },
    averageHoldMinutes: 60,
    byDayOfWeek: [
      {
        dayIndex: 1,
        label: "Monday",
        count: 2,
        totalPnl: 60,
        averagePnl: 30,
        winRate: 50,
        profitFactor: 2.5,
      },
      {
        dayIndex: 2,
        label: "Tuesday",
        count: 1,
        totalPnl: 70,
        averagePnl: 70,
        winRate: 100,
        profitFactor: Number.POSITIVE_INFINITY,
      },
    ],
    byHour: [
      {
        hour: 14,
        label: "14:00 UTC",
        count: 2,
        totalPnl: 170,
        averagePnl: 85,
        winRate: 100,
        profitFactor: Number.POSITIVE_INFINITY,
      },
      {
        hour: 16,
        label: "16:00 UTC",
        count: 1,
        totalPnl: -40,
        averagePnl: -40,
        winRate: 0,
        profitFactor: 0,
      },
    ],
  });

  const filteredStats = await getStatsForUser(first.id, {
    from: "2026-06-09",
    to: "2026-06-09",
  });
  assert.equal(filteredStats.stats.totalTrades, 1);
  assert.equal(filteredStats.stats.averagePnl, 70);
  assert.equal(filteredStats.filters.from, "2026-06-09");
  assert.equal(filteredStats.filters.to, "2026-06-09");

  const secondStats = await getStatsForUser(second.id);
  assert.equal(secondStats.stats.bestTrade?.symbol, "META");
  assert.equal(secondStats.stats.averagePnl, 1000);

  const emptyStats = calculateTradeStats([]);
  assert.equal(emptyStats.winRate, null);
  assert.equal(emptyStats.profitFactor, null);
  assert.equal(emptyStats.averagePnl, null);
  assert.equal(emptyStats.bestTrade, null);
  assert.deepEqual(emptyStats.byDayOfWeek, []);
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
