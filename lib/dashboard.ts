export type DashboardFilter = "today" | "week" | "month" | "year" | "last-year" | "all";

export type DashboardTrade = {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  entryDateTime: string;
  entryPrice: number;
  exitDateTime: string | null;
  exitPrice: number | null;
  status: string;
  returnAmount: number | null;
  returnPercent: number | null;
};

export type DashboardOpenPositionPnl = {
  tradeId: string;
  symbol: string;
  status: "available" | "unavailable";
  side: string;
  remainingQuantity: number;
  averageEntryPrice?: number;
  latestPrice: number | null;
  unrealizedPnl: number | null;
  quoteAsOf?: string;
  message?: string;
};

export type DashboardSummary = {
  totalPnl: number;
  wins: number;
  losses: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  openTrades: number;
  closedTrades: number;
};

export type EquityPoint = {
  id: string;
  date: string;
  symbol: string;
  pnl: number;
  equity: number;
  pointPercent: number;
  returnPercent: number;
};

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

export function getDateRange(filter: DashboardFilter, now = new Date()) {
  const today = startOfLocalDay(now);

  if (filter === "all") {
    return { start: null, end: null };
  }

  if (filter === "today") {
    return { start: today, end: endOfLocalDay(now) };
  }

  if (filter === "week") {
    const mondayOffset = (today.getDay() + 6) % 7;
    return {
      start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset),
      end: endOfLocalDay(now),
    };
  }

  if (filter === "month") {
    return {
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: endOfLocalDay(now),
    };
  }

  if (filter === "year") {
    return {
      start: new Date(today.getFullYear(), 0, 1),
      end: endOfLocalDay(now),
    };
  }

  return {
    start: new Date(today.getFullYear() - 1, 0, 1),
    end: new Date(today.getFullYear(), 0, 1),
  };
}

export function filterDashboardTrades(
  trades: DashboardTrade[],
  filter: DashboardFilter,
  now = new Date(),
) {
  const { start, end } = getDateRange(filter, now);

  if (!start || !end) {
    return trades;
  }

  return trades.filter((trade) => {
    const tradeDate = new Date(trade.entryDateTime);
    return tradeDate >= start && tradeDate < end;
  });
}

export function getDashboardSummary(trades: DashboardTrade[]): DashboardSummary {
  const realized = trades.filter((trade) => trade.returnAmount !== null);
  const winners = realized.filter((trade) => Number(trade.returnAmount) > 0);
  const losers = realized.filter((trade) => Number(trade.returnAmount) < 0);
  const totalPnl = realized.reduce((sum, trade) => sum + Number(trade.returnAmount ?? 0), 0);
  const totalWins = winners.reduce((sum, trade) => sum + Number(trade.returnAmount), 0);
  const totalLosses = losers.reduce((sum, trade) => sum + Number(trade.returnAmount), 0);
  const closed = trades.filter((trade) => trade.status === "CLOSED");

  return {
    totalPnl,
    wins: winners.length,
    losses: losers.length,
    winRate: realized.length === 0 ? 0 : (winners.length / realized.length) * 100,
    averageWin: winners.length === 0 ? 0 : totalWins / winners.length,
    averageLoss: losers.length === 0 ? 0 : totalLosses / losers.length,
    openTrades: trades.filter((trade) => trade.status === "OPEN").length,
    closedTrades: closed.length,
  };
}

export function getEquityPoints(trades: DashboardTrade[]): EquityPoint[] {
  let equity = 0;
  let basis = 0;

  return trades
    .filter((trade) => trade.returnAmount !== null)
    .sort((left, right) => {
      const leftDate = new Date(left.exitDateTime ?? left.entryDateTime).getTime();
      const rightDate = new Date(right.exitDateTime ?? right.entryDateTime).getTime();
      return leftDate - rightDate;
    })
    .map((trade) => {
      const pnl = Number(trade.returnAmount ?? 0);
      equity += pnl;
      basis += realizedBasis(trade);

      return {
        id: trade.id,
        date: trade.exitDateTime ?? trade.entryDateTime,
        symbol: trade.symbol,
        pnl,
        equity,
        pointPercent: Number(trade.returnPercent ?? 0),
        returnPercent: basis <= 0 ? 0 : roundPercent((equity / basis) * 100),
      };
    });
}

export type EquityChartPoint = {
  id: string;
  date: string | null;
  symbol: string;
  pnl: number;
  pointPercent: number;
  absoluteValue: number;
  percentValue: number;
};

export type OpenPositionPnlPoint = EquityChartPoint & {
  latestPrice: number;
  quoteAsOf: string | null;
  remainingQuantity: number;
};

export type OpenPositionPnlUnavailable = {
  tradeId: string;
  symbol: string;
  message: string;
};

export type EquityChartModel = {
  closed: EquityChartPoint[];
  open: OpenPositionPnlPoint[];
  unavailableOpen: OpenPositionPnlUnavailable[];
};

export function getEquityChartModel(
  trades: DashboardTrade[],
  openPositionPnl: DashboardOpenPositionPnl[] = [],
): EquityChartModel {
  const closed = getEquityPoints(trades).map((point) => ({
    id: point.id,
    date: point.date,
    symbol: point.symbol,
    pnl: point.pnl,
    pointPercent: point.pointPercent,
    absoluteValue: point.equity,
    percentValue: point.returnPercent,
  }));

  let openPnl = 0;
  let openBasis = 0;
  const open = openPositionPnl
    .filter(
      (
        point,
      ): point is DashboardOpenPositionPnl & {
        status: "available";
        averageEntryPrice: number;
        latestPrice: number;
        unrealizedPnl: number;
      } =>
        point.status === "available" &&
        point.latestPrice !== null &&
        point.unrealizedPnl !== null &&
        point.averageEntryPrice !== undefined,
    )
    .sort((left, right) => left.symbol.localeCompare(right.symbol) || left.tradeId.localeCompare(right.tradeId))
    .map((point) => {
      openPnl += point.unrealizedPnl;
      openBasis += point.averageEntryPrice * point.remainingQuantity;

      return {
        id: point.tradeId,
        date: point.quoteAsOf ?? null,
        symbol: point.symbol,
        pnl: point.unrealizedPnl,
        pointPercent: roundPercent((point.unrealizedPnl / (point.averageEntryPrice * point.remainingQuantity)) * 100),
        absoluteValue: roundMoney(openPnl),
        percentValue: openBasis <= 0 ? 0 : roundPercent((openPnl / openBasis) * 100),
        latestPrice: point.latestPrice,
        quoteAsOf: point.quoteAsOf ?? null,
        remainingQuantity: point.remainingQuantity,
      };
    });

  const unavailableOpen = openPositionPnl
    .filter((point) => point.status === "unavailable")
    .map((point) => ({
      tradeId: point.tradeId,
      symbol: point.symbol,
      message: point.message ?? "Latest EOD quote is unavailable.",
    }));

  return { closed, open, unavailableOpen };
}

function realizedBasis(trade: DashboardTrade) {
  const pnl = Number(trade.returnAmount ?? 0);
  const percent = Number(trade.returnPercent ?? 0);

  if (Number.isFinite(percent) && percent !== 0) {
    return Math.abs(pnl / (percent / 100));
  }

  return Math.max(0, trade.entryPrice * trade.quantity);
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function roundPercent(value: number) {
  return Number(value.toFixed(2));
}
