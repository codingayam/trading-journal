import { redirect } from "next/navigation";
import { AppSidebar } from "@/app/app-sidebar";
import { TradingWorkspace } from "@/app/trading-workspace";
import type { TradeRecord } from "@/app/trade-log";
import { getCurrentUserWithTradingData } from "@/lib/auth";
import { calculateOpenPositionPnl, latestEodQuoteProvider } from "@/lib/market-data";
import type { DashboardOpenPositionPnl } from "@/lib/dashboard";
import { serializeTrade } from "@/lib/trades";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUserWithTradingData();

  if (!user) {
    redirect("/login");
  }

  const trades = user.trades.map(serializeTrade);
  const openPositionPnl = await getOpenPositionPnl(trades);

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

async function getOpenPositionPnl(trades: TradeRecord[]): Promise<DashboardOpenPositionPnl[]> {
  const openTrades = trades.filter((trade) => trade.status === "OPEN" && trade.remainingQuantity > 0);

  return Promise.all(
    openTrades.map(async (trade) => {
      const quoteResult = await latestEodQuoteProvider.getLatestEodQuote(trade.symbol);
      const result = calculateOpenPositionPnl({
        symbol: trade.symbol,
        side: trade.side,
        executions: trade.executions.map((execution) => ({
          action: execution.action === "SELL" ? "SELL" : "BUY",
          executedAt: new Date(execution.executedAt),
          quantity: execution.quantity,
          price: execution.price.toFixed(2),
          fees: execution.fees.toFixed(2),
        })),
        quoteResult,
      });

      return {
        tradeId: trade.id,
        symbol: result.symbol,
        status: result.status,
        side: result.side,
        remainingQuantity: result.remainingQuantity,
        averageEntryPrice: result.status === "available" ? result.averageEntryPrice : undefined,
        latestPrice: result.latestPrice,
        unrealizedPnl: result.unrealizedPnl,
        quoteAsOf: result.status === "available" ? result.quote.asOf : undefined,
        message: result.status === "unavailable" ? result.message : undefined,
      };
    }),
  );
}
