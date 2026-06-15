import { NextResponse } from "next/server";
import { getCurrentUserWithTradingData } from "@/lib/auth";
import { getOpenPositionPnlForTrades } from "@/lib/market-data";
import { serializeTrade } from "@/lib/trades";

export async function GET() {
  const user = await getCurrentUserWithTradingData();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const trades = user.trades.map(serializeTrade);
  const openPositionPnl = await getOpenPositionPnlForTrades(trades);

  return NextResponse.json({ openPositionPnl });
}
