import { redirect } from "next/navigation";
import { AppSidebar } from "@/app/app-sidebar";
import { TradingWorkspace } from "@/app/trading-workspace";
import { getCurrentUserWithTradingData } from "@/lib/auth";
import { buildSetupSummaries } from "@/lib/setups";
import { serializeTrade } from "@/lib/trades";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUserWithTradingData();

  if (!user) {
    redirect("/login");
  }

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

        <TradingWorkspace
          initialTrades={user.trades.map(serializeTrade)}
          setupSummaries={buildSetupSummaries(
            user.setups,
            user.trades.map((trade) => ({
              setupId: trade.setupId,
              status: trade.status,
              returnAmount: trade.grossPnl === null ? null : Number(trade.grossPnl),
            })),
          )}
        />
      </section>
    </main>
  );
}
