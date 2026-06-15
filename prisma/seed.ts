import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password";
import {
  deriveExecutionSnapshot,
  tradeSnapshotData,
  type ParsedExecutionInput,
} from "../lib/trades";

const prisma = new PrismaClient();

const demoUserId = "demo-user";
const demoEmail = "demo@tradingjournal.local";

type SeedTrade = {
  id: string;
  assetClass: string;
  symbol: string;
  side: string;
  executions: ParsedExecutionInput[];
};

const trades: SeedTrade[] = [
  {
    id: "trade-aapl-2026-06-08",
    assetClass: "Stock",
    symbol: "AAPL",
    side: "LONG",
    executions: [
      {
        action: "BUY",
        executedAt: new Date("2026-06-08T14:05:00.000Z"),
        quantity: 50,
        price: "196.20",
        fees: "0.00",
      },
      {
        action: "SELL",
        executedAt: new Date("2026-06-08T15:10:00.000Z"),
        quantity: 50,
        price: "198.10",
        fees: "0.00",
      },
    ],
  },
  {
    id: "trade-msft-2026-06-08",
    assetClass: "Stock",
    symbol: "MSFT",
    side: "LONG",
    executions: [
      {
        action: "BUY",
        executedAt: new Date("2026-06-08T15:20:00.000Z"),
        quantity: 20,
        price: "470.50",
        fees: "0.00",
      },
      {
        action: "SELL",
        executedAt: new Date("2026-06-08T16:05:00.000Z"),
        quantity: 20,
        price: "468.80",
        fees: "0.00",
      },
    ],
  },
  {
    id: "trade-tsm-2026-06-09",
    assetClass: "Stock",
    symbol: "TSM",
    side: "LONG",
    executions: [
      {
        action: "BUY",
        executedAt: new Date("2026-06-09T02:15:00.000Z"),
        quantity: 30,
        price: "182.40",
        fees: "0.00",
      },
      {
        action: "SELL",
        executedAt: new Date("2026-06-09T03:00:00.000Z"),
        quantity: 30,
        price: "184.00",
        fees: "0.00",
      },
    ],
  },
  {
    id: "trade-meta-2026-06-09",
    assetClass: "Stock",
    symbol: "META",
    side: "SHORT",
    executions: [
      {
        action: "SELL",
        executedAt: new Date("2026-06-09T13:40:00.000Z"),
        quantity: 10,
        price: "633.20",
        fees: "0.00",
      },
      {
        action: "BUY",
        executedAt: new Date("2026-06-09T14:05:00.000Z"),
        quantity: 10,
        price: "635.00",
        fees: "0.00",
      },
    ],
  },
  {
    id: "trade-amzn-partial-2026-06-10",
    assetClass: "Stock",
    symbol: "AMZN",
    side: "LONG",
    executions: [
      {
        action: "BUY",
        executedAt: new Date("2026-06-10T13:35:00.000Z"),
        quantity: 100,
        price: "180.00",
        fees: "0.00",
      },
      {
        action: "SELL",
        executedAt: new Date("2026-06-10T14:05:00.000Z"),
        quantity: 40,
        price: "190.00",
        fees: "0.00",
      },
    ],
  },
  {
    id: "trade-nvda-2026-06-10",
    assetClass: "Stock",
    symbol: "NVDA",
    side: "LONG",
    executions: [
      {
        action: "BUY",
        executedAt: new Date("2026-06-10T14:30:00.000Z"),
        quantity: 5,
        price: "143.20",
        fees: "0.00",
      },
    ],
  },
];

async function upsertTrade(trade: SeedTrade) {
  const snapshot = deriveExecutionSnapshot(trade.side, trade.executions);
  if (snapshot.errors.length > 0) {
    throw new Error(`Invalid seed executions for ${trade.id}: ${snapshot.errors.join(", ")}`);
  }

  const snapshotData = tradeSnapshotData(snapshot);
  const fees = trade.executions
    .reduce((sum, execution) => sum + Number(execution.fees), 0)
    .toFixed(2);
  const firstExecution = trade.executions[0];

  await prisma.trade.upsert({
    where: { id: trade.id },
    create: {
      id: trade.id,
      userId: demoUserId,
      assetClass: trade.assetClass,
      tradeDate: firstExecution.executedAt,
      symbol: trade.symbol,
      side: trade.side,
      quantity: snapshotData.quantity,
      entryPrice: snapshotData.entryPrice ?? firstExecution.price,
      exitDate: snapshotData.exitDate,
      exitPrice: snapshotData.exitPrice,
      fees,
      status: snapshotData.status,
      grossPnl: snapshotData.grossPnl,
      executions: {
        create: trade.executions.map((execution) => ({
          action: execution.action,
          executedAt: execution.executedAt,
          quantity: execution.quantity,
          price: execution.price,
          fees: execution.fees,
        })),
      },
    },
    update: {
      assetClass: trade.assetClass,
      tradeDate: firstExecution.executedAt,
      symbol: trade.symbol,
      side: trade.side,
      quantity: snapshotData.quantity,
      entryPrice: snapshotData.entryPrice ?? firstExecution.price,
      exitDate: snapshotData.exitDate,
      exitPrice: snapshotData.exitPrice,
      fees,
      status: snapshotData.status,
      grossPnl: snapshotData.grossPnl,
      executions: {
        deleteMany: {},
        create: trade.executions.map((execution) => ({
          action: execution.action,
          executedAt: execution.executedAt,
          quantity: execution.quantity,
          price: execution.price,
          fees: execution.fees,
        })),
      },
    },
  });
}

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

  for (const trade of trades) {
    await upsertTrade(trade);
  }
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
