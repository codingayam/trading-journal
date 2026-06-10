"use client";

import { useMemo, useState } from "react";
import { DashboardView } from "@/app/dashboard-view";
import { PnlCalendar } from "@/app/pnl-calendar";
import { SetupSummaryList } from "@/app/setup-summary";
import { TradeLog, type TradeRecord } from "@/app/trade-log";
import type { SetupSummary } from "@/lib/setups";

type TradingWorkspaceProps = {
  initialTrades: TradeRecord[];
  setupSummaries: SetupSummary[];
};

export function TradingWorkspace({ initialTrades, setupSummaries }: TradingWorkspaceProps) {
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
        <SetupSummaryList setups={setupSummaries} />
        <PnlCalendar trades={sortedTrades} />
      </section>
    </>
  );
}
