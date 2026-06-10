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
    <>
      <DashboardView trades={sortedTrades} />
      <section className="dashboard-grid">
        <TradeLog onTradesChange={setTrades} trades={sortedTrades} />
        <PnlCalendar trades={sortedTrades} />
      </section>
    </>
  );
}
