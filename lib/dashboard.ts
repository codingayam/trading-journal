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

      return {
        id: trade.id,
        date: trade.exitDateTime ?? trade.entryDateTime,
        symbol: trade.symbol,
        pnl,
        equity,
      };
    });
}
