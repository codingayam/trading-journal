export type CalendarTrade = {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  entryDateTime: string;
  exitDateTime: string | null;
  status: string;
  returnAmount: number | null;
  returnPercent: number | null;
};

export type CalendarDay = {
  date: Date;
  dateKey: string;
  inMonth: boolean;
  pnl: number;
  tradeCount: number;
  trades: CalendarTrade[];
};

export type CalendarMonth = {
  days: CalendarDay[];
  monthPnl: number;
  tradeCount: number;
  closedTrades: CalendarTrade[];
};

export function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function closedTradeDate(trade: CalendarTrade) {
  if (trade.status !== "CLOSED" || trade.returnAmount === null || !trade.exitDateTime) {
    return null;
  }

  const date = new Date(trade.exitDateTime);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildMonthlyPnlCalendar(
  trades: CalendarTrade[],
  year: number,
  monthIndex: number,
): CalendarMonth {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const firstGridDate = new Date(firstOfMonth);
  firstGridDate.setDate(firstGridDate.getDate() - firstOfMonth.getDay());

  const lastOfMonth = new Date(year, monthIndex + 1, 0);
  const lastGridDate = new Date(lastOfMonth);
  lastGridDate.setDate(lastGridDate.getDate() + (6 - lastOfMonth.getDay()));

  const closedTrades = trades.filter((trade) => {
    const date = closedTradeDate(trade);
    return date !== null && date.getFullYear() === year && date.getMonth() === monthIndex;
  });

  const tradesByDay = new Map<string, CalendarTrade[]>();
  for (const trade of closedTrades) {
    const date = closedTradeDate(trade);
    if (!date) {
      continue;
    }

    const key = dateKey(date);
    tradesByDay.set(key, [...(tradesByDay.get(key) ?? []), trade]);
  }

  const days: CalendarDay[] = [];
  const cursor = new Date(firstGridDate);
  while (cursor <= lastGridDate) {
    const key = dateKey(cursor);
    const dayTrades = tradesByDay.get(key) ?? [];
    days.push({
      date: new Date(cursor),
      dateKey: key,
      inMonth: cursor.getMonth() === monthIndex,
      pnl: dayTrades.reduce((sum, trade) => sum + (trade.returnAmount ?? 0), 0),
      tradeCount: dayTrades.length,
      trades: dayTrades,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    days,
    monthPnl: closedTrades.reduce((sum, trade) => sum + (trade.returnAmount ?? 0), 0),
    tradeCount: closedTrades.length,
    closedTrades,
  };
}
