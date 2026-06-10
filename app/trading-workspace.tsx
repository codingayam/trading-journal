"use client";

import { useMemo, useState } from "react";
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
      <TradeLog onTradesChange={setTrades} trades={sortedTrades} />
      <PnlCalendar trades={sortedTrades} />
    </>
  );
}
