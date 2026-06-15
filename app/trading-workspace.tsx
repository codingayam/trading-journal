"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [openPositionPnl, setOpenPositionPnl] = useState(initialOpenPositionPnl);
  const sortedTrades = useMemo(
    () =>
      [...trades].sort(
        (left, right) =>
          new Date(right.entryDateTime).getTime() - new Date(left.entryDateTime).getTime(),
      ),
    [trades],
  );
  const openTrades = useMemo(
    () => sortedTrades.filter((trade) => trade.status === "OPEN" && trade.remainingQuantity > 0),
    [sortedTrades],
  );
  const openTradeSignature = useMemo(
    () =>
      openTrades
        .map((trade) =>
          [
            trade.id,
            trade.symbol,
            trade.side,
            trade.remainingQuantity,
            ...trade.executions.map((execution) =>
              [
                execution.id ?? "",
                execution.action,
                execution.executedAt,
                execution.quantity,
                execution.price,
                execution.fees,
              ].join(":"),
            ),
          ].join("|"),
        )
        .join("||"),
    [openTrades],
  );

  useEffect(() => {
    if (openTrades.length === 0) {
      setOpenPositionPnl([]);
      return;
    }

    const controller = new AbortController();

    fetch("/api/open-position-pnl", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Open-position PnL refresh failed with HTTP ${response.status}.`);
        }

        return response.json() as Promise<{ openPositionPnl?: DashboardOpenPositionPnl[] }>;
      })
      .then((body) => {
        if (!Array.isArray(body.openPositionPnl)) {
          throw new Error("Open-position PnL refresh returned an invalid response.");
        }

        setOpenPositionPnl(body.openPositionPnl);
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        const message = error instanceof Error ? error.message : "Open-position PnL refresh failed.";
        setOpenPositionPnl(openTrades.map((trade) => unavailableOpenPositionPnl(trade, message)));
      });

    return () => controller.abort();
  }, [openTradeSignature, openTrades]);

  const activeOpenPositionPnl = useMemo(
    () => {
      const existing = openPositionPnl.filter((point) =>
        openTrades.some((trade) => trade.id === point.tradeId),
      );
      const existingIds = new Set(existing.map((point) => point.tradeId));
      const missing = openTrades
        .filter((trade) => !existingIds.has(trade.id))
        .map((trade) =>
          unavailableOpenPositionPnl(
            trade,
            "Latest EOD quote has not been fetched for this open trade yet.",
          ),
        );

      return [...existing, ...missing];
    },
    [openPositionPnl, openTrades],
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

function unavailableOpenPositionPnl(
  trade: TradeRecord,
  message: string,
): DashboardOpenPositionPnl {
  return {
    tradeId: trade.id,
    symbol: trade.symbol,
    status: "unavailable",
    side: trade.side,
    remainingQuantity: trade.remainingQuantity,
    latestPrice: null,
    unrealizedPnl: null,
    message,
  };
}
