import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { parseTradeInput, serializeTrade } from "@/lib/trades";

export async function GET(request: Request) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  const trades = await prisma.trade.findMany({
    where: { userId: user.id },
    orderBy: { tradeDate: "desc" },
  });

  return NextResponse.json({ trades: trades.map(serializeTrade) });
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  const body = await request.json().catch(() => null);
  const parsed = parseTradeInput(body, "create");

  if (!parsed.ok) {
    return NextResponse.json({ errors: parsed.errors }, { status: 400 });
  }

  const data = parsed.data;
  if (
    !data.assetClass ||
    !data.tradeDate ||
    !data.symbol ||
    !data.side ||
    data.quantity === undefined ||
    data.entryPrice === undefined ||
    data.fees === undefined ||
    !data.status
  ) {
    return NextResponse.json({ errors: ["Missing required trade fields."] }, { status: 400 });
  }

  const trade = await prisma.trade.create({
    data: {
      userId: user.id,
      assetClass: data.assetClass,
      tradeDate: data.tradeDate,
      symbol: data.symbol,
      side: data.side,
      quantity: data.quantity,
      entryPrice: data.entryPrice,
      exitDate: data.exitDate,
      exitPrice: data.exitPrice,
      fees: data.fees,
      status: data.status,
      grossPnl: data.grossPnl,
    },
  });

  return NextResponse.json({ trade: serializeTrade(trade) }, { status: 201 });
}
