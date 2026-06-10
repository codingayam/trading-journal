import { redirect } from "next/navigation";
import { LogoutButton } from "@/app/logout-button";
import { TradeLog } from "@/app/trade-log";
import { getCurrentUserWithTradingData } from "@/lib/auth";
import { serializeTrade } from "@/lib/trades";

export const dynamic = "force-dynamic";

const navItems = ["Dashboard", "Trades", "Setups", "Stats", "Calendar"];

function money(value: unknown) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function dateLabel(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function percent(value: number) {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

export default async function Home() {
  const user = await getCurrentUserWithTradingData();

  if (!user) {
    redirect("/login");
  }

  const totalPnl = user.trades.reduce(
    (sum, trade) => sum + Number(trade.grossPnl ?? 0),
    0,
  );
  const winningTrades = user.trades.filter(
    (trade) => Number(trade.grossPnl ?? 0) > 0,
  ).length;
  const winRate =
    user.trades.length === 0
      ? 0
      : Math.round((winningTrades / user.trades.length) * 100);
  const averagePnl = user.trades.length === 0 ? 0 : totalPnl / user.trades.length;
  const largestAbsPnl = Math.max(
    1,
    ...user.trades.map((trade) => Math.abs(Number(trade.grossPnl ?? 0))),
  );

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Product navigation">
        <div className="brand-lockup" aria-label="Trading Journal">
          <span className="brand-mark">TJ</span>
          <div>
            <strong>Trading Journal</strong>
            <span>{user.displayName}</span>
          </div>
        </div>

        <nav className="side-nav">
          {navItems.map((item) => (
            <a
              aria-current={item === "Dashboard" ? "page" : undefined}
              href={`#${item.toLowerCase()}`}
              key={item}
            >
              {item}
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <LogoutButton />
        </div>
      </aside>

      <section className="workspace">
        <header className="workspace-header" id="dashboard">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>Trading Command Center</h1>
          </div>
        </header>

        <section className="metric-grid" aria-label="Trading summary">
          <article className="card metric-card">
            <span>Trades</span>
            <strong>{user.trades.length}</strong>
            <small>{user.sessions.length} active sessions</small>
          </article>
          <article className="card metric-card">
            <span>Total P/L</span>
            <strong className={totalPnl >= 0 ? "positive" : "negative"}>
              {money(totalPnl)}
            </strong>
            <small>{money(averagePnl)} average</small>
          </article>
          <article className="card metric-card">
            <span>Win Rate</span>
            <strong>{winRate}%</strong>
            <small>{winningTrades} winning trades</small>
          </article>
          <article className="card metric-card">
            <span>Setups</span>
            <strong>{user.setups.length}</strong>
            <small>{user.setups.filter((setup) => setup.isActive).length} active</small>
          </article>
        </section>

        <section className="dashboard-grid">
          <TradeLog initialTrades={user.trades.map(serializeTrade)} />

          <article className="card" id="stats">
            <div className="card-heading">
              <div>
                <p className="eyebrow">Stats</p>
                <h2>P/L Distribution</h2>
              </div>
              <span className="badge">Gross</span>
            </div>
            <div className="bar-chart" aria-label="P/L chart">
              {user.trades.map((trade) => {
                const pnl = Number(trade.grossPnl ?? 0);
                return (
                  <div className="chart-row" key={trade.id}>
                    <span>{trade.symbol}</span>
                    <div className="chart-track">
                      <span
                        className={pnl >= 0 ? "chart-bar positive-bar" : "chart-bar negative-bar"}
                        style={{ width: percent((Math.abs(pnl) / largestAbsPnl) * 100) }}
                      />
                    </div>
                    <strong className={pnl >= 0 ? "positive" : "negative"}>
                      {money(pnl)}
                    </strong>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="card" id="setups">
            <div className="card-heading">
              <div>
                <p className="eyebrow">Setups</p>
                <h2>Playbook</h2>
              </div>
            </div>
            <div className="stack-list">
              {user.setups.map((setup) => (
                <article className="list-row" key={setup.id}>
                  <div>
                    <strong>{setup.name}</strong>
                    <span>{setup.description}</span>
                  </div>
                  <span className={setup.isActive ? "badge badge-success" : "badge"}>
                    {setup.isActive ? "Active" : "Paused"}
                  </span>
                </article>
              ))}
            </div>
          </article>

          <article className="card" id="calendar">
            <div className="card-heading">
              <div>
                <p className="eyebrow">Calendar</p>
                <h2>Sessions</h2>
              </div>
            </div>
            <div className="stack-list">
              {user.sessions.map((session) => (
                <article className="list-row" key={session.id}>
                  <div>
                    <strong>{session.title}</strong>
                    <span>{session.market ?? "Market not set"}</span>
                  </div>
                  <time>{dateLabel(session.sessionDate)}</time>
                </article>
              ))}
            </div>
          </article>

          <article className="card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">Notes</p>
                <h2>Day Notes</h2>
              </div>
            </div>
            <div className="note-grid">
              {user.dayNotes.map((note) => (
                <article className="note-item" key={note.id}>
                  <time>{dateLabel(note.noteDate)}</time>
                  <h3>{note.title}</h3>
                  <p>{note.body}</p>
                </article>
              ))}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
