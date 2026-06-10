import { redirect } from "next/navigation";
import { AppSidebar } from "@/app/app-sidebar";
import { DashboardView } from "@/app/dashboard-view";
import { getCurrentUserWithTradingData } from "@/lib/auth";
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

        <DashboardView trades={user.trades.map(serializeTrade)} />
      </section>
    </main>
  );
}
