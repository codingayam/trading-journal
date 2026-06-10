import { redirect } from "next/navigation";
import { LogoutButton } from "@/app/logout-button";
import { TradingWorkspace } from "@/app/trading-workspace";
import { getCurrentUserWithTradingData } from "@/lib/auth";
import { serializeTrade } from "@/lib/trades";

export const dynamic = "force-dynamic";

const navItems = ["Dashboard", "Trades", "Setups", "Stats", "Calendar"];

export default async function Home() {
  const user = await getCurrentUserWithTradingData();

  if (!user) {
    redirect("/login");
  }

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
            <h1>Performance Dashboard</h1>
          </div>
        </header>

        <TradingWorkspace initialTrades={user.trades.map(serializeTrade)} />
      </section>
    </main>
  );
}
