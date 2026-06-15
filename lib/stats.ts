import type { Prisma, Trade } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cleanupDuplicateTickerTrades } from "@/lib/trade-tickers";

export type StatsDateFilters = {
  from?: string;
  to?: string;
};

export type TradeStats = ReturnType<typeof calculateTradeStats>;

type StatsTrade = Pick<
  Trade,
  "id" | "symbol" | "tradeDate" | "exitDate" | "status" | "grossPnl"
>;

type RealizedTrade = {
  id: string;
  symbol: string;
  tradeDate: Date;
  exitDate: Date | null;
  pnl: number;
};

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "long",
});

function decimalNumber(value: Prisma.Decimal | null) {
  return value === null ? null : Number(value);
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function cleanDateInput(value: string | undefined) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? value : undefined;
}

export function parseStatsDateFilters(filters: StatsDateFilters) {
  const from = cleanDateInput(filters.from);
  const to = cleanDateInput(filters.to);

  return {
    from,
    to,
    fromDate: from ? new Date(`${from}T00:00:00.000Z`) : undefined,
    toDate: to ? new Date(`${to}T23:59:59.999Z`) : undefined,
  };
}

function summarizeTrades(trades: RealizedTrade[]) {
  const totalPnl = roundMoney(trades.reduce((sum, trade) => sum + trade.pnl, 0));
  const wins = trades.filter((trade) => trade.pnl > 0);
  const losses = trades.filter((trade) => trade.pnl < 0);
  const winTotal = wins.reduce((sum, trade) => sum + trade.pnl, 0);
  const lossTotal = Math.abs(losses.reduce((sum, trade) => sum + trade.pnl, 0));

  return {
    count: trades.length,
    totalPnl,
    averagePnl: trades.length === 0 ? null : roundMoney(totalPnl / trades.length),
    winRate: trades.length === 0 ? null : roundMoney((wins.length / trades.length) * 100),
    profitFactor:
      lossTotal === 0
        ? winTotal > 0
          ? Number.POSITIVE_INFINITY
          : null
        : roundMoney(winTotal / lossTotal),
  };
}

function groupBy<T extends string | number>(trades: RealizedTrade[], keyFor: (trade: RealizedTrade) => T) {
  const groups = new Map<T, RealizedTrade[]>();

  for (const trade of trades) {
    const key = keyFor(trade);
    groups.set(key, [...(groups.get(key) ?? []), trade]);
  }

  return groups;
}

export function calculateTradeStats(trades: StatsTrade[]) {
  const realizedTrades: RealizedTrade[] = trades.flatMap((trade) => {
    const pnl = decimalNumber(trade.grossPnl);

    if (trade.status !== "CLOSED" || pnl === null || !Number.isFinite(pnl)) {
      return [];
    }

    return [
      {
        id: trade.id,
        symbol: trade.symbol,
        tradeDate: trade.tradeDate,
        exitDate: trade.exitDate,
        pnl,
      },
    ];
  });

  const wins = realizedTrades.filter((trade) => trade.pnl > 0);
  const losses = realizedTrades.filter((trade) => trade.pnl < 0);
  const summary = summarizeTrades(realizedTrades);
  const holdDurations = realizedTrades
    .filter((trade) => trade.exitDate)
    .map((trade) => trade.exitDate!.getTime() - trade.tradeDate.getTime())
    .filter((duration) => duration >= 0);

  const sortedByBest = [...realizedTrades].sort(
    (a, b) => b.pnl - a.pnl || a.tradeDate.getTime() - b.tradeDate.getTime() || a.id.localeCompare(b.id),
  );
  const sortedByWorst = [...realizedTrades].sort(
    (a, b) => a.pnl - b.pnl || a.tradeDate.getTime() - b.tradeDate.getTime() || a.id.localeCompare(b.id),
  );

  const byDayOfWeek = [...groupBy<number>(realizedTrades, (trade) => trade.tradeDate.getUTCDay()).entries()]
    .map(([dayIndex, group]) => ({
      dayIndex,
      label: weekdayFormatter.format(new Date(Date.UTC(2026, 0, 4 + dayIndex))),
      ...summarizeTrades(group),
    }))
    .sort((a, b) => a.dayIndex - b.dayIndex);

  const byHour = [...groupBy<number>(realizedTrades, (trade) => trade.tradeDate.getUTCHours()).entries()]
    .map(([hour, group]) => ({
      hour,
      label: `${String(hour).padStart(2, "0")}:00 UTC`,
      ...summarizeTrades(group),
    }))
    .sort((a, b) => a.hour - b.hour);

  return {
    totalTrades: trades.length,
    closedTrades: realizedTrades.length,
    openTrades: trades.length - realizedTrades.length,
    winRate: summary.winRate,
    profitFactor: summary.profitFactor,
    averagePnl: summary.averagePnl,
    averageWin: wins.length === 0 ? null : roundMoney(wins.reduce((sum, trade) => sum + trade.pnl, 0) / wins.length),
    averageLoss:
      losses.length === 0 ? null : roundMoney(losses.reduce((sum, trade) => sum + trade.pnl, 0) / losses.length),
    bestTrade: sortedByBest[0] ? { symbol: sortedByBest[0].symbol, pnl: sortedByBest[0].pnl } : null,
    worstTrade: sortedByWorst[0] ? { symbol: sortedByWorst[0].symbol, pnl: sortedByWorst[0].pnl } : null,
    averageHoldMinutes:
      holdDurations.length === 0
        ? null
        : Math.round(
            holdDurations.reduce((sum, duration) => sum + duration, 0) /
              holdDurations.length /
              60_000,
          ),
    byDayOfWeek,
    byHour,
  };
}

export async function getStatsForUser(userId: string, filters: StatsDateFilters = {}) {
  await cleanupDuplicateTickerTrades(userId);

  const parsed = parseStatsDateFilters(filters);
  const tradeDate: Prisma.DateTimeFilter = {};

  if (parsed.fromDate) {
    tradeDate.gte = parsed.fromDate;
  }

  if (parsed.toDate) {
    tradeDate.lte = parsed.toDate;
  }

  const trades = await prisma.trade.findMany({
    where: {
      userId,
      ...(Object.keys(tradeDate).length > 0 ? { tradeDate } : {}),
    },
    orderBy: { tradeDate: "asc" },
  });

  return {
    filters: {
      from: parsed.from,
      to: parsed.to,
    },
    stats: calculateTradeStats(trades),
  };
}
