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

  await prisma.journalSession.upsert({
    where: { id: "session-2026-06-08" },
    create: {
      id: "session-2026-06-08",
      userId: demoUserId,
      title: "Monday US cash session",
      sessionDate: new Date("2026-06-08T13:30:00.000Z"),
      market: "US equities",
      summary: "Focused on liquid large caps and kept risk defined.",
    },
    update: {
      title: "Monday US cash session",
      sessionDate: new Date("2026-06-08T13:30:00.000Z"),
      market: "US equities",
      summary: "Focused on liquid large caps and kept risk defined.",
    },
  });

  await prisma.journalSession.upsert({
    where: { id: "session-2026-06-09" },
    create: {
      id: "session-2026-06-09",
      userId: demoUserId,
      title: "Tuesday Asia watchlist",
      sessionDate: new Date("2026-06-09T01:30:00.000Z"),
      market: "Asia equities",
      summary: "Took fewer trades while waiting for confirmation.",
    },
    update: {
      title: "Tuesday Asia watchlist",
      sessionDate: new Date("2026-06-09T01:30:00.000Z"),
      market: "Asia equities",
      summary: "Took fewer trades while waiting for confirmation.",
    },
  });

  await prisma.trade.upsert({
    where: { id: "trade-aapl-2026-06-08" },
    create: {
      id: "trade-aapl-2026-06-08",
      userId: demoUserId,
      setupId: "setup-orb",
      sessionId: "session-2026-06-08",
      tradeDate: new Date("2026-06-08T14:05:00.000Z"),
      symbol: "AAPL",
      side: "LONG",
      quantity: 50,
      entryPrice: "196.20",
      exitPrice: "198.10",
      grossPnl: "95.00",
      notes: "Clean break with defined stop under opening range.",
    },
    update: {
      setupId: "setup-orb",
      sessionId: "session-2026-06-08",
      tradeDate: new Date("2026-06-08T14:05:00.000Z"),
      symbol: "AAPL",
      side: "LONG",
      quantity: 50,
      entryPrice: "196.20",
      exitPrice: "198.10",
      grossPnl: "95.00",
      notes: "Clean break with defined stop under opening range.",
    },
  });

  await prisma.trade.upsert({
    where: { id: "trade-msft-2026-06-08" },
    create: {
      id: "trade-msft-2026-06-08",
      userId: demoUserId,
      setupId: "setup-pullback",
      sessionId: "session-2026-06-08",
      tradeDate: new Date("2026-06-08T15:20:00.000Z"),
      symbol: "MSFT",
      side: "LONG",
      quantity: 20,
      entryPrice: "470.50",
      exitPrice: "468.80",
      grossPnl: "-34.00",
      notes: "Support failed quickly; exited according to plan.",
    },
    update: {
      setupId: "setup-pullback",
      sessionId: "session-2026-06-08",
      tradeDate: new Date("2026-06-08T15:20:00.000Z"),
      symbol: "MSFT",
      side: "LONG",
      quantity: 20,
      entryPrice: "470.50",
      exitPrice: "468.80",
      grossPnl: "-34.00",
      notes: "Support failed quickly; exited according to plan.",
    },
  });

  await prisma.trade.upsert({
    where: { id: "trade-tsm-2026-06-09" },
    create: {
      id: "trade-tsm-2026-06-09",
      userId: demoUserId,
      setupId: "setup-orb",
      sessionId: "session-2026-06-09",
      tradeDate: new Date("2026-06-09T02:15:00.000Z"),
      symbol: "TSM",
      side: "LONG",
      quantity: 30,
      entryPrice: "182.40",
      exitPrice: "184.00",
      grossPnl: "48.00",
      notes: "Smaller size due to thinner morning liquidity.",
    },
    update: {
      setupId: "setup-orb",
      sessionId: "session-2026-06-09",
      tradeDate: new Date("2026-06-09T02:15:00.000Z"),
      symbol: "TSM",
      side: "LONG",
      quantity: 30,
      entryPrice: "182.40",
      exitPrice: "184.00",
      grossPnl: "48.00",
      notes: "Smaller size due to thinner morning liquidity.",
    },
  });

  await prisma.dayNote.upsert({
    where: {
      userId_noteDate: {
        userId: demoUserId,
        noteDate: new Date("2026-06-08T00:00:00.000Z"),
      },
    },
    create: {
      id: "day-note-2026-06-08",
      userId: demoUserId,
      noteDate: new Date("2026-06-08T00:00:00.000Z"),
      title: "Risk stayed controlled",
      body: "Best trades had clear invalidation before entry.",
    },
    update: {
      title: "Risk stayed controlled",
      body: "Best trades had clear invalidation before entry.",
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
