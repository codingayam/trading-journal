import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

const demoUserId = "demo-user";
const demoEmail = "demo@tradingjournal.local";

async function main() {
  const demoPasswordHash = await hashPassword("password123");

  await prisma.user.upsert({
    where: { id: demoUserId },
    create: {
      id: demoUserId,
      email: demoEmail,
      displayName: "Demo Trader",
      passwordHash: demoPasswordHash,
    },
    update: {
      email: demoEmail,
      displayName: "Demo Trader",
      passwordHash: demoPasswordHash,
    },
  });

  await prisma.tradeSetup.upsert({
    where: {
      userId_name: {
        userId: demoUserId,
        name: "Opening range breakout",
      },
    },
    create: {
      id: "setup-orb",
      userId: demoUserId,
      name: "Opening range breakout",
      description: "Momentum continuation after the first range is cleared.",
      playbook: "Wait for range break, confirm volume, define invalidation.",
    },
    update: {
      description: "Momentum continuation after the first range is cleared.",
      playbook: "Wait for range break, confirm volume, define invalidation.",
      isActive: true,
    },
  });

  await prisma.tradeSetup.upsert({
    where: {
      userId_name: {
        userId: demoUserId,
        name: "Pullback to support",
      },
    },
    create: {
      id: "setup-pullback",
      userId: demoUserId,
      name: "Pullback to support",
      description: "Trend-following entry after a controlled retracement.",
      playbook: "Prefer higher low structure and tight risk.",
    },
    update: {
      description: "Trend-following entry after a controlled retracement.",
      playbook: "Prefer higher low structure and tight risk.",
      isActive: true,
    },
  });

  await prisma.trade.upsert({
    where: { id: "trade-aapl-2026-06-08" },
    create: {
      id: "trade-aapl-2026-06-08",
      userId: demoUserId,
      setupId: "setup-orb",
      assetClass: "Stock",
      tradeDate: new Date("2026-06-08T14:05:00.000Z"),
      symbol: "AAPL",
      side: "LONG",
      quantity: 50,
      entryPrice: "196.20",
      exitDate: new Date("2026-06-08T15:10:00.000Z"),
      exitPrice: "198.10",
      fees: "0",
      status: "CLOSED",
      grossPnl: "95.00",
    },
    update: {
      setupId: "setup-orb",
      assetClass: "Stock",
      tradeDate: new Date("2026-06-08T14:05:00.000Z"),
      symbol: "AAPL",
      side: "LONG",
      quantity: 50,
      entryPrice: "196.20",
      exitDate: new Date("2026-06-08T15:10:00.000Z"),
      exitPrice: "198.10",
      fees: "0",
      status: "CLOSED",
      grossPnl: "95.00",
    },
  });

  await prisma.trade.upsert({
    where: { id: "trade-msft-2026-06-08" },
    create: {
      id: "trade-msft-2026-06-08",
      userId: demoUserId,
      setupId: "setup-orb",
      assetClass: "Stock",
      tradeDate: new Date("2026-06-08T15:20:00.000Z"),
      symbol: "MSFT",
      side: "LONG",
      quantity: 20,
      entryPrice: "470.50",
      exitDate: new Date("2026-06-08T16:05:00.000Z"),
      exitPrice: "468.80",
      fees: "0",
      status: "CLOSED",
      grossPnl: "-34.00",
    },
    update: {
      setupId: "setup-orb",
      assetClass: "Stock",
      tradeDate: new Date("2026-06-08T15:20:00.000Z"),
      symbol: "MSFT",
      side: "LONG",
      quantity: 20,
      entryPrice: "470.50",
      exitDate: new Date("2026-06-08T16:05:00.000Z"),
      exitPrice: "468.80",
      fees: "0",
      status: "CLOSED",
      grossPnl: "-34.00",
    },
  });

  await prisma.trade.upsert({
    where: { id: "trade-tsm-2026-06-09" },
    create: {
      id: "trade-tsm-2026-06-09",
      userId: demoUserId,
      setupId: "setup-pullback",
      assetClass: "Stock",
      tradeDate: new Date("2026-06-09T02:15:00.000Z"),
      symbol: "TSM",
      side: "LONG",
      quantity: 30,
      entryPrice: "182.40",
      exitDate: new Date("2026-06-09T03:00:00.000Z"),
      exitPrice: "184.00",
      fees: "0",
      status: "CLOSED",
      grossPnl: "48.00",
    },
    update: {
      setupId: "setup-pullback",
      assetClass: "Stock",
      tradeDate: new Date("2026-06-09T02:15:00.000Z"),
      symbol: "TSM",
      side: "LONG",
      quantity: 30,
      entryPrice: "182.40",
      exitDate: new Date("2026-06-09T03:00:00.000Z"),
      exitPrice: "184.00",
      fees: "0",
      status: "CLOSED",
      grossPnl: "48.00",
    },
  });

  await prisma.trade.upsert({
    where: { id: "trade-meta-2026-06-09" },
    create: {
      id: "trade-meta-2026-06-09",
      userId: demoUserId,
      setupId: "setup-pullback",
      assetClass: "Stock",
      tradeDate: new Date("2026-06-09T13:40:00.000Z"),
      symbol: "META",
      side: "SHORT",
      quantity: 10,
      entryPrice: "633.20",
      exitDate: new Date("2026-06-09T14:05:00.000Z"),
      exitPrice: "635.00",
      fees: "0",
      status: "CLOSED",
      grossPnl: "-18.00",
    },
    update: {
      setupId: "setup-pullback",
      assetClass: "Stock",
      tradeDate: new Date("2026-06-09T13:40:00.000Z"),
      symbol: "META",
      side: "SHORT",
      quantity: 10,
      entryPrice: "633.20",
      exitDate: new Date("2026-06-09T14:05:00.000Z"),
      exitPrice: "635.00",
      fees: "0",
      status: "CLOSED",
      grossPnl: "-18.00",
    },
  });

  await prisma.trade.upsert({
    where: { id: "trade-nvda-2026-06-10" },
    create: {
      id: "trade-nvda-2026-06-10",
      userId: demoUserId,
      setupId: "setup-pullback",
      assetClass: "Stock",
      tradeDate: new Date("2026-06-10T14:30:00.000Z"),
      symbol: "NVDA",
      side: "LONG",
      quantity: 5,
      entryPrice: "143.20",
      fees: "0",
      status: "OPEN",
    },
    update: {
      setupId: "setup-pullback",
      assetClass: "Stock",
      tradeDate: new Date("2026-06-10T14:30:00.000Z"),
      symbol: "NVDA",
      side: "LONG",
      quantity: 5,
      entryPrice: "143.20",
      exitDate: null,
      exitPrice: null,
      fees: "0",
      status: "OPEN",
      grossPnl: null,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
