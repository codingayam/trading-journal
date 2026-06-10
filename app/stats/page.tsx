import { redirect } from "next/navigation";
import { AppSidebar } from "@/app/app-sidebar";
import { getCurrentUser } from "@/lib/auth";
import { getStatsForUser } from "@/lib/stats";

export const dynamic = "force-dynamic";

type StatsPageProps = {
  searchParams?: Promise<{
    from?: string;
    to?: string;
  }>;
};

function money(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function percent(value: number | null) {
  return value === null ? "N/A" : `${value.toFixed(value % 1 === 0 ? 0 : 2)}%`;
}

function factor(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  return value === Number.POSITIVE_INFINITY ? "∞" : value.toFixed(value % 1 === 0 ? 0 : 2);
}

function holdTime(minutes: number | null) {
  if (minutes === null) {
    return "N/A";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  return `${hours}h ${String(remainingMinutes).padStart(2, "0")}m`;
}

function tradeLabel(trade: { symbol: string; pnl: number } | null) {
  return trade ? `${trade.symbol} ${money(trade.pnl)}` : "N/A";
}

function BreakdownTable({
  rows,
  title,
}: {
  rows: Array<{
    label: string;
    count: number;
    totalPnl: number;
    averagePnl: number | null;
    winRate: number | null;
  }>;
  title: string;
}) {
  return (
    <article className="card">
      <div className="card-heading">
        <div>
          <p className="eyebrow">Breakdown</p>
          <h2>{title}</h2>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="empty-state">No closed trades in this range.</p>
      ) : (
        <div className="table-wrap">
          <table className="stats-table">
            <thead>
              <tr>
                <th>Bucket</th>
                <th>Trades</th>
                <th>Total P/L</th>
                <th>Average</th>
                <th>Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <td className="symbol">{row.label}</td>
                  <td>{row.count}</td>
                  <td className={row.totalPnl >= 0 ? "positive" : "negative"}>
                    {money(row.totalPnl)}
                  </td>
                  <td>{money(row.averagePnl)}</td>
                  <td>{percent(row.winRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

export default async function StatsPage({ searchParams }: StatsPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const params = (await searchParams) ?? {};
  const { filters, stats } = await getStatsForUser(user.id, params);

  const metrics = [
    { label: "Win Rate", value: percent(stats.winRate), detail: `${stats.closedTrades} closed trades` },
    { label: "Profit Factor", value: factor(stats.profitFactor), detail: `${stats.openTrades} open trades excluded` },
    { label: "Expectancy", value: money(stats.averagePnl), detail: "Simple average P/L" },
    { label: "Average Win", value: money(stats.averageWin), detail: "Winning closed trades" },
    { label: "Average Loss", value: money(stats.averageLoss), detail: "Losing closed trades" },
    { label: "Best Trade", value: tradeLabel(stats.bestTrade), detail: "Highest realized P/L" },
    { label: "Worst Trade", value: tradeLabel(stats.worstTrade), detail: "Lowest realized P/L" },
    { label: "Average Hold", value: holdTime(stats.averageHoldMinutes), detail: "Closed trades with exits" },
  ];

  return (
    <main className="app-shell">
      <AppSidebar current="Stats" displayName={user.displayName} />

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Stats</p>
            <h1>Performance Stats</h1>
          </div>
        </header>

        <form action="/stats" className="card filter-bar">
          <label>
            From
            <input defaultValue={filters.from ?? ""} name="from" type="date" />
          </label>
          <label>
            To
            <input defaultValue={filters.to ?? ""} name="to" type="date" />
          </label>
          <div className="filter-actions">
            <a className="secondary-button" href="/stats">
              Reset
            </a>
            <button className="primary-button" type="submit">
              Apply
            </button>
          </div>
        </form>

        {stats.closedTrades === 0 ? (
          <article className="card empty-panel">
            <p className="eyebrow">No Closed Trades</p>
            <h2>Stats will appear after closed trades have realized P/L.</h2>
          </article>
        ) : null}

        <section className="metric-grid stats-metric-grid" aria-label="Performance metrics">
          {metrics.map((metric) => (
            <article className="card metric-card" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.detail}</small>
            </article>
          ))}
        </section>

        <section className="breakdown-grid">
          <BreakdownTable rows={stats.byDayOfWeek} title="By Day of Week" />
          <BreakdownTable rows={stats.byHour} title="By Hour" />
        </section>
      </section>
    </main>
  );
}
