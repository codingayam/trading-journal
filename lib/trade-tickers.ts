import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  derivedTradeWriteData,
  legacyExecutionsFromTrade,
} from "@/lib/trades";

export type TradeWithExecutions = Prisma.TradeGetPayload<{
  include: {
    executions: true;
  };
}>;

export type ExecutionForWrite = {
  action: string;
  executedAt: Date;
  quantity: number;
  price: string | Prisma.Decimal;
  fees: string | Prisma.Decimal;
};

export class TradeApiError extends Error {
  constructor(
    readonly errors: string[],
    readonly status = 400,
  ) {
    super(errors.join(" "));
  }
}

export function executionCreateData(tradeId: string, executions: ExecutionForWrite[]) {
  return executions.map((execution) => ({
    tradeId,
    action: execution.action,
    executedAt: execution.executedAt,
    quantity: execution.quantity,
    price: execution.price,
    fees: execution.fees,
  }));
}

export function executionsForTrade(trade: TradeWithExecutions): ExecutionForWrite[] {
  return trade.executions.length > 0
    ? trade.executions
    : legacyExecutionsFromTrade({
        side: trade.side,
        tradeDate: trade.tradeDate,
        quantity: trade.quantity,
        entryPrice: trade.entryPrice,
        exitDate: trade.exitDate,
        exitPrice: trade.exitPrice,
        fees: trade.fees,
        status: trade.status,
      });
}

function canonicalTrade(trades: TradeWithExecutions[]) {
  return [...trades].sort((left, right) => {
    const tradeDateDelta = left.tradeDate.getTime() - right.tradeDate.getTime();
    const createdDelta = left.createdAt.getTime() - right.createdAt.getTime();
    return tradeDateDelta || createdDelta || left.id.localeCompare(right.id);
  })[0];
}

export async function mergeTickerTrades(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    assetClass: string;
    symbol: string;
  },
) {
  const tickerTrades = await tx.trade.findMany({
    where: {
      userId: input.userId,
      assetClass: input.assetClass,
    },
    include: {
      executions: {
        orderBy: { executedAt: "asc" },
      },
    },
  });
  const trades = tickerTrades.filter(
    (trade) => trade.symbol.toUpperCase() === input.symbol.toUpperCase(),
  );

  if (trades.length === 0) {
    return null;
  }

  const sides = new Set(trades.map((trade) => trade.side));
  if (sides.size > 1) {
    throw new TradeApiError([
      `Existing ${input.symbol} trades use mixed sides. Resolve them before adding more executions.`,
    ]);
  }

  const canonical = canonicalTrade(trades);
  const allExecutions = trades.flatMap(executionsForTrade);
  const derived = derivedTradeWriteData(canonical.side, allExecutions, {
    tradeDate: canonical.tradeDate,
    entryPrice: canonical.entryPrice,
    fees: canonical.fees,
  });

  if (!derived.ok) {
    throw new TradeApiError(derived.errors);
  }

  const tradeIds = trades.map((trade) => trade.id);
  await tx.tradeExecution.deleteMany({ where: { tradeId: { in: tradeIds } } });
  await tx.tradeExecution.createMany({
    data: executionCreateData(canonical.id, allExecutions),
  });

  const duplicateIds = tradeIds.filter((id) => id !== canonical.id);
  if (duplicateIds.length > 0) {
    await tx.trade.deleteMany({ where: { id: { in: duplicateIds } } });
  }

  return tx.trade.update({
    where: { id: canonical.id },
    data: {
      assetClass: input.assetClass,
      symbol: input.symbol.toUpperCase(),
      ...derived.data,
    },
    include: {
      executions: {
        orderBy: { executedAt: "asc" },
      },
    },
  });
}

export async function cleanupDuplicateTickerTrades(userId: string) {
  const trades = await prisma.trade.findMany({
    where: { userId },
    orderBy: [{ assetClass: "asc" }, { symbol: "asc" }, { tradeDate: "asc" }],
    include: {
      executions: {
        orderBy: { executedAt: "asc" },
      },
    },
  });
  const groups = new Map<string, TradeWithExecutions[]>();

  for (const trade of trades) {
    const normalizedSymbol = trade.symbol.toUpperCase();
    const key = `${trade.assetClass}\u0000${normalizedSymbol}`;
    groups.set(key, [...(groups.get(key) ?? []), { ...trade, symbol: normalizedSymbol }]);
  }

  for (const group of groups.values()) {
    if (group.length < 2 || new Set(group.map((trade) => trade.side)).size > 1) {
      continue;
    }

    await prisma.$transaction((tx) =>
      mergeTickerTrades(tx, {
        userId,
        assetClass: group[0].assetClass,
        symbol: group[0].symbol,
      }),
    );
  }
}
