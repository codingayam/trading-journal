"use client";

import { useMemo, useState } from "react";
import {
  DashboardFilter,
  DashboardTrade,
  filterDashboardTrades,
  getDashboardSummary,
  getEquityPoints,
} from "@/lib/dashboard";

const filters: { key: DashboardFilter; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
  { key: "last-year", label: "Last year" },
  { key: "all", label: "Reset" },
];

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function signedMoney(value: number) {
  const formatted = moneyFormatter.format(Math.abs(value));
  return value < 0 ? `-${formatted}` : formatted;
}

function percent(value: number | null) {
  if (value === null) {
    return "Open";
  }

  return `${value.toFixed(2)}%`;
}

function shortDate(value: string | null) {
  if (!value) {
    return "Open";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function pnlClass(value: number | null) {
  if (value === null || value === 0) {
    return "muted-cell";
  }

  return value > 0 ? "positive" : "negative";
}

function metricTone(value: number) {
  if (value === 0) {
    return undefined;
  }

  return value > 0 ? "positive" : "negative";
}

function chartPath(points: ReturnType<typeof getEquityPoints>) {
  if (points.length === 0) {
    return "";
  }

  const values = points.map((point) => point.equity);
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(0, ...values);
  const range = Math.max(1, maxValue - minValue);

  return points
    .map((point, index) => {
      const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
      const y = 92 - ((point.equity - minValue) / range) * 74;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function EmptyState() {
  return (
    <div className="dashboard-empty">
      <strong>No trades in this view</strong>
      <span>
        Demo data appears after a different quick filter is selected. New accounts will
        show this state until trades exist.
      </span>
    </div>
  );
}

export function DashboardView({ trades }: { trades: DashboardTrade[] }) {
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>("all");
  const filteredTrades = useMemo(
    () => filterDashboardTrades(trades, activeFilter),
    [activeFilter, trades],
  );
  const summary = useMemo(() => getDashboardSummary(filteredTrades), [filteredTrades]);
  const equityPoints = useMemo(() => getEquityPoints(filteredTrades), [filteredTrades]);
  const linePath = chartPath(equityPoints);

  const metrics = [
    { label: "Total PnL", value: signedMoney(summary.totalPnl), tone: metricTone(summary.totalPnl) },
    { label: "Wins", value: String(summary.wins) },
    { label: "Losses", value: String(summary.losses) },
    { label: "Win Rate", value: `${Math.round(summary.winRate)}%` },
    { label: "Average Win", value: signedMoney(summary.averageWin), tone: "positive" },
    { label: "Average Loss", value: signedMoney(summary.averageLoss), tone: "negative" },
    { label: "Open Trades", value: String(summary.openTrades) },
  ];

  return (
    <>
      <section className="filter-bar" aria-label="Quick date filters">
        {filters.map((filter) => (
          <button
            aria-pressed={activeFilter === filter.key}
            key={filter.key}
            onClick={() => setActiveFilter(filter.key)}
            type="button"
          >
            {filter.label}
          </button>
        ))}
      </section>

      <section className="metric-grid dashboard-metrics" aria-label="Trading summary">
        {metrics.map((metric) => (
          <article className="card metric-card compact-metric" key={metric.label}>
            <span>{metric.label}</span>
            <strong className={metric.tone}>{metric.value}</strong>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="card span-2" id="trades">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Trades</p>
              <h2>Recent Performance</h2>
            </div>
            <span className="badge badge-neutral">{filteredTrades.length} shown</span>
          </div>

          {filteredTrades.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="table-wrap dense-table-wrap">
              <table className="dense-trade-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Symbol</th>
                    <th>Side</th>
                    <th>Quantity</th>
                    <th>Entry</th>
                    <th>Exit</th>
                    <th>PnL</th>
                    <th>PnL %</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.map((trade) => (
                    <tr key={trade.id}>
                      <td>{shortDate(trade.entryDateTime)}</td>
                      <td className="symbol">{trade.symbol}</td>
                      <td>
                        <span className={trade.side === "LONG" ? "badge badge-success" : "badge badge-danger"}>
                          {trade.side}
                        </span>
                      </td>
                      <td>{trade.quantity}</td>
                      <td>{moneyFormatter.format(trade.entryPrice)}</td>
                      <td>{trade.exitPrice === null ? "Open" : moneyFormatter.format(trade.exitPrice)}</td>
                      <td className={pnlClass(trade.returnAmount)}>
                        {trade.returnAmount === null ? "Open" : signedMoney(trade.returnAmount)}
                      </td>
                      <td className={pnlClass(trade.returnAmount)}>
                        {percent(trade.returnPercent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="card span-2">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Equity</p>
              <h2>Closed Trade PnL Curve</h2>
            </div>
            <span className="badge badge-neutral">{summary.closedTrades} closed</span>
          </div>

          {equityPoints.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="equity-chart" aria-label="Closed trade equity curve">
              <svg role="img" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polyline className="equity-baseline" points="0,92 100,92" />
                <polyline className="equity-line" points={linePath} />
              </svg>
              <div className="equity-points">
                {equityPoints.map((point) => (
                  <div key={point.id}>
                    <span>{shortDate(point.date)} / {point.symbol}</span>
                    <strong className={metricTone(point.pnl)}>{signedMoney(point.pnl)}</strong>
                    <em>{signedMoney(point.equity)}</em>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>
      </section>
    </>
  );
}
