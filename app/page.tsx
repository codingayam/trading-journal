import { redirect } from "next/navigation";
import { LogoutButton } from "@/app/logout-button";
import { getCurrentUserWithTradingData } from "@/lib/auth";

export const dynamic = "force-dynamic";

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

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Authenticated shell</p>
          <h1>{user.displayName}</h1>
        </div>
        <div className="identity">
          <span>{user.email}</span>
          <LogoutButton />
        </div>
      </header>

      <section className="metrics" aria-label="Trading summary">
        <article>
          <span>Trades</span>
          <strong>{user.trades.length}</strong>
        </article>
        <article>
          <span>Total P/L</span>
          <strong className={totalPnl >= 0 ? "positive" : "negative"}>
            {money(totalPnl)}
          </strong>
        </article>
        <article>
          <span>Win Rate</span>
          <strong>{winRate}%</strong>
        </article>
        <article>
          <span>Setups</span>
          <strong>{user.setups.length}</strong>
        </article>
      </section>

      <section className="content-grid">
        <div className="panel wide">
          <div className="panel-heading">
            <h2>Recent Trades</h2>
            <span>{user.trades.length} seeded</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Symbol</th>
                  <th>Side</th>
                  <th>Setup</th>
                  <th>Quantity</th>
                  <th>P/L</th>
                </tr>
              </thead>
              <tbody>
                {user.trades.map((trade) => (
                  <tr key={trade.id}>
                    <td>{dateLabel(trade.tradeDate)}</td>
                    <td className="symbol">{trade.symbol}</td>
                    <td>{trade.side}</td>
                    <td>{trade.setup?.name ?? "Unassigned"}</td>
                    <td>{trade.quantity}</td>
                    <td
                      className={
                        Number(trade.grossPnl ?? 0) >= 0
                          ? "positive"
                          : "negative"
                      }
                    >
                      {money(trade.grossPnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <h2>Sessions</h2>
          </div>
          <div className="stack">
            {user.sessions.map((session) => (
              <article className="row" key={session.id}>
                <div>
                  <strong>{session.title}</strong>
                  <span>{session.market ?? "Market not set"}</span>
                </div>
                <time>{dateLabel(session.sessionDate)}</time>
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <h2>Setups</h2>
          </div>
          <div className="stack">
            {user.setups.map((setup) => (
              <article className="row" key={setup.id}>
                <div>
                  <strong>{setup.name}</strong>
                  <span>{setup.description}</span>
                </div>
                <span className={setup.isActive ? "status" : "status muted"}>
                  {setup.isActive ? "Active" : "Paused"}
                </span>
              </article>
            ))}
          </div>
        </div>

        <div className="panel wide">
          <div className="panel-heading">
            <h2>Day Notes</h2>
          </div>
          <div className="notes">
            {user.dayNotes.map((note) => (
              <article key={note.id}>
                <time>{dateLabel(note.noteDate)}</time>
                <h3>{note.title}</h3>
                <p>{note.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
