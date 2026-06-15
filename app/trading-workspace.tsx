"use client";

import { useMemo, useState } from "react";
import { DashboardView } from "@/app/dashboard-view";
import { PnlCalendar } from "@/app/pnl-calendar";
import { TradeLog, type TradeRecord } from "@/app/trade-log";
import type { DashboardOpenPositionPnl } from "@/lib/dashboard";

type TradingWorkspaceProps = {
  initialOpenPositionPnl: DashboardOpenPositionPnl[];
  initialTrades: TradeRecord[];
};

export function TradingWorkspace({ initialOpenPositionPnl, initialTrades }: TradingWorkspaceProps) {
  const [trades, setTrades] = useState(initialTrades);
  const sortedTrades = useMemo(
    () =>
      [...trades].sort(
        (left, right) =>
          new Date(right.entryDateTime).getTime() - new Date(left.entryDateTime).getTime(),
      ),
    [trades],
  );
  const activeOpenPositionPnl = useMemo(
    () => {
      const openTrades = sortedTrades.filter((trade) => trade.status === "OPEN" && trade.remainingQuantity > 0);
      const existing = initialOpenPositionPnl.filter((point) =>
        openTrades.some((trade) => trade.id === point.tradeId),
      );
      const existingIds = new Set(existing.map((point) => point.tradeId));
      const missing = openTrades
        .filter((trade) => !existingIds.has(trade.id))
        .map((trade) => ({
          tradeId: trade.id,
          symbol: trade.symbol,
          status: "unavailable" as const,
          side: trade.side,
          remainingQuantity: trade.remainingQuantity,
          latestPrice: null,
          unrealizedPnl: null,
          message: "Latest EOD quote has not been fetched for this open trade yet.",
        }));

      return [...existing, ...missing];
    },
    [initialOpenPositionPnl, sortedTrades],
  );

  return (
    <div className="dashboard-shell">
      <DashboardView openPositionPnl={activeOpenPositionPnl} trades={sortedTrades} />
      <section className="dashboard-primary-trades-slot" aria-label="Primary trade list">
        <TradeLog onTradesChange={setTrades} trades={sortedTrades} />
      </section>
      <section className="dashboard-calendar-slot" aria-label="Calendar and realized P/L">
        <PnlCalendar trades={sortedTrades} />
      </section>
    </div>
  );
}
