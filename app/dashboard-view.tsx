"use client";

import { useMemo, useState } from "react";
import {
  DashboardFilter,
  DashboardTrade,
  filterDashboardTrades,
  getEquityChartModel,
  getDashboardSummary,
} from "@/lib/dashboard";
import type { DashboardOpenPositionPnl } from "@/lib/dashboard";

const filters: { key: DashboardFilter; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
  { key: "last-year", label: "Last year" },
  { key: "all", label: "Reset" },
];

type ChartMode = "absolute" | "percent";

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function signedMoney(value: number) {
  const formatted = moneyFormatter.format(Math.abs(value));
  return value < 0 ? `-${formatted}` : formatted;
}

function signedPercent(value: number) {
  const formatted = `${Math.abs(value).toFixed(Math.abs(value) >= 10 ? 1 : 2)}%`;
  return value < 0 ? `-${formatted}` : formatted;
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

function metricTone(value: number) {
  if (value === 0) {
    return undefined;
  }

  return value > 0 ? "positive" : "negative";
}

function chartValue(point: { absoluteValue: number; percentValue: number }, mode: ChartMode) {
  return mode === "absolute" ? point.absoluteValue : point.percentValue;
}

function chartPath(
  points: Array<{ absoluteValue: number; percentValue: number }>,
  mode: ChartMode,
  bounds: { min: number; max: number },
) {
  if (points.length === 0) {
    return "";
  }

  const range = Math.max(1, bounds.max - bounds.min);

  return points
    .map((point, index) => {
      const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
      const y = 92 - ((chartValue(point, mode) - bounds.min) / range) * 74;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function chartBounds(
  points: Array<{ absoluteValue: number; percentValue: number }>,
  mode: ChartMode,
) {
  const values = points.map((point) => chartValue(point, mode));
  return {
    min: Math.min(0, ...values),
    max: Math.max(0, ...values),
  };
}

function formatChartValue(value: number, mode: ChartMode) {
  return mode === "absolute" ? signedMoney(value) : signedPercent(value);
}

function formatQuoteDate(value: string | null) {
  if (!value) {
    return "Latest EOD";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
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

export function DashboardView({
  openPositionPnl = [],
  trades,
}: {
  openPositionPnl?: DashboardOpenPositionPnl[];
  trades: DashboardTrade[];
}) {
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>("all");
  const [chartMode, setChartMode] = useState<ChartMode>("absolute");
  const filteredTrades = useMemo(
    () => filterDashboardTrades(trades, activeFilter),
    [activeFilter, trades],
  );
  const summary = useMemo(() => getDashboardSummary(filteredTrades), [filteredTrades]);
  const chartModel = useMemo(
    () => getEquityChartModel(filteredTrades, openPositionPnl),
    [filteredTrades, openPositionPnl],
  );
  const chartPoints = [...chartModel.closed, ...chartModel.open];
  const bounds = chartBounds(chartPoints, chartMode);
  const closedLinePath = chartPath(chartModel.closed, chartMode, bounds);
  const openLinePath = chartPath(chartModel.open, chartMode, bounds);
  const chartHasData = chartModel.closed.length > 0 || chartModel.open.length > 0;
  const yAxisLabel = chartMode === "absolute" ? "USD P&L" : "Return %";
  const quoteStateLabel =
    chartModel.open.length > 0 && chartModel.unavailableOpen.length > 0
      ? "Partial EOD quotes"
      : chartModel.open.length > 0
        ? "EOD quotes available"
        : chartModel.unavailableOpen.length > 0
          ? "EOD quotes unavailable"
          : "No open positions";

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
      <section className="filter-bar dashboard-filter-slot" aria-label="Quick date filters">
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

      <section className="metric-grid dashboard-metrics dashboard-kpi-slot" aria-label="Trading summary">
        {metrics.map((metric) => (
          <article className="card metric-card compact-metric" key={metric.label}>
            <span>{metric.label}</span>
            <strong className={metric.tone}>{metric.value}</strong>
          </article>
        ))}
      </section>

      <section className="dashboard-grid dashboard-equity-grid">
        <article className="card span-2 dashboard-equity-slot" id="dashboard-equity">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Equity</p>
              <h2>Equity and Open PnL Curve</h2>
            </div>
            <div className="equity-heading-actions">
              <div className="segmented-control" aria-label="Equity chart mode">
                <button
                  aria-pressed={chartMode === "absolute"}
                  onClick={() => setChartMode("absolute")}
                  type="button"
                >
                  Dollars
                </button>
                <button
                  aria-pressed={chartMode === "percent"}
                  onClick={() => setChartMode("percent")}
                  type="button"
                >
                  Percent
                </button>
              </div>
              <span className="badge badge-neutral">{summary.closedTrades} closed</span>
            </div>
          </div>

          {chartHasData ? (
            <div className="equity-chart" aria-label={`Equity chart, y-axis ${yAxisLabel}`}>
              <div className="equity-chart-meta">
                <div>
                  <span>Y-axis</span>
                  <strong>{yAxisLabel}</strong>
                </div>
                <div>
                  <span>Range</span>
                  <strong>
                    {formatChartValue(bounds.min, chartMode)} to {formatChartValue(bounds.max, chartMode)}
                  </strong>
                </div>
                <div>
                  <span>Open PnL</span>
                  <strong>{quoteStateLabel}</strong>
                </div>
              </div>
              <svg role="img" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polyline className="equity-baseline" points="0,92 100,92" />
                {closedLinePath ? <polyline className="equity-line equity-line-closed" points={closedLinePath} /> : null}
                {openLinePath ? <polyline className="equity-line equity-line-open" points={openLinePath} /> : null}
              </svg>
              <div className="equity-legend" aria-label="Equity chart series">
                <span>
                  <i className="legend-swatch legend-closed" />
                  Closed trades
                </span>
                {chartModel.open.length > 0 ? (
                  <span>
                    <i className="legend-swatch legend-open" />
                    Open positions
                  </span>
                ) : null}
              </div>
              <div className="equity-points">
                {chartModel.closed.map((point) => (
                  <div key={point.id}>
                    <span>{shortDate(point.date)} / {point.symbol}</span>
                    <strong className={metricTone(point.pnl)}>
                      {formatChartValue(chartMode === "absolute" ? point.pnl : point.pointPercent, chartMode)}
                    </strong>
                    <em>{formatChartValue(chartValue(point, chartMode), chartMode)} closed curve</em>
                  </div>
                ))}
                {chartModel.open.map((point) => (
                  <div className="open-equity-point" key={point.id}>
                    <span>
                      {point.symbol} / {formatQuoteDate(point.quoteAsOf)}
                    </span>
                    <strong className={metricTone(point.pnl)}>
                      {formatChartValue(chartMode === "absolute" ? point.pnl : point.pointPercent, chartMode)}
                    </strong>
                    <em>
                      {formatChartValue(chartValue(point, chartMode), chartMode)} open curve at{" "}
                      {signedMoney(point.latestPrice)}
                    </em>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState />
          )}
          {chartModel.unavailableOpen.length > 0 ? (
            <div className="quote-state-panel" role="status">
              <strong>
                {chartModel.open.length > 0 ? "Partial open-position PnL data" : "Open-position PnL unavailable"}
              </strong>
              <ul>
                {chartModel.unavailableOpen.map((point) => (
                  <li key={point.tradeId}>
                    <span>{point.symbol}</span>
                    <em>{point.message}</em>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </article>
      </section>
    </>
  );
}
