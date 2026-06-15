import { redirect } from "next/navigation";
import { AppSidebar } from "@/app/app-sidebar";
import { TradingWorkspace } from "@/app/trading-workspace";
import { getCurrentUserWithTradingData } from "@/lib/auth";
import { getOpenPositionPnlForTrades } from "@/lib/market-data";
import { serializeTrade } from "@/lib/trades";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUserWithTradingData();

  if (!user) {
    redirect("/login");
  }

  const trades = user.trades.map(serializeTrade);
  const openPositionPnl = await getOpenPositionPnlForTrades(trades);

  return (
    <main className="app-shell">
      <AppSidebar current="Dashboard" displayName={user.displayName} />

      <section className="workspace">
        <header className="workspace-header" id="dashboard">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>Performance Dashboard</h1>
          </div>
        </header>

        <TradingWorkspace initialOpenPositionPnl={openPositionPnl} initialTrades={trades} />
      </section>
    </main>
  );
}
