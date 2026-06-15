"use client";

import { useMemo, useState } from "react";
import { DashboardView } from "@/app/dashboard-view";
import { PnlCalendar } from "@/app/pnl-calendar";
import { TradeLog, type TradeRecord } from "@/app/trade-log";

type TradingWorkspaceProps = {
  initialTrades: TradeRecord[];
};

export function TradingWorkspace({ initialTrades }: TradingWorkspaceProps) {
  const [trades, setTrades] = useState(initialTrades);
  const sortedTrades = useMemo(
    () =>
      [...trades].sort(
        (left, right) =>
          new Date(right.entryDateTime).getTime() - new Date(left.entryDateTime).getTime(),
      ),
    [trades],
  );

  return (
    <div className="dashboard-shell">
      <DashboardView trades={sortedTrades} />
      <section className="dashboard-primary-trades-slot" aria-label="Primary trade list">
        <TradeLog onTradesChange={setTrades} trades={sortedTrades} />
      </section>
      <section className="dashboard-calendar-slot" aria-label="Calendar and realized P/L">
        <PnlCalendar trades={sortedTrades} />
      </section>
    </div>
  );
}
