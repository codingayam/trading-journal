import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  deriveExecutionSnapshot,
  legacyExecutionsFromTrade,
  parseTradeInput,
  serializeTrade,
  tradeSnapshotData,
} from "@/lib/trades";

export async function GET(request: Request) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  const trades = await prisma.trade.findMany({
    where: { userId: user.id },
    orderBy: { tradeDate: "desc" },
    include: {
      executions: {
        orderBy: { executedAt: "asc" },
      },
    },
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
  const { executions: parsedExecutions } = data;
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

  const executions =
    parsedExecutions ??
    legacyExecutionsFromTrade({
      side: data.side,
      tradeDate: data.tradeDate,
      quantity: data.quantity,
      entryPrice: data.entryPrice,
      exitDate: data.exitDate,
      exitPrice: data.exitPrice,
      fees: data.fees,
      status: data.status,
    });
  const snapshot = deriveExecutionSnapshot(data.side, executions);
  if (snapshot.errors.length > 0) {
    return NextResponse.json({ errors: snapshot.errors }, { status: 400 });
  }
  const snapshotData = tradeSnapshotData(snapshot);
  const executionFees = executions.reduce((sum, execution) => sum + Number(execution.fees), 0);

  const trade = await prisma.trade.create({
    data: {
      userId: user.id,
      assetClass: data.assetClass,
      tradeDate: data.tradeDate,
      symbol: data.symbol,
      side: data.side,
      quantity: snapshotData.quantity,
      entryPrice: snapshotData.entryPrice ?? data.entryPrice,
      exitDate: snapshotData.exitDate,
      exitPrice: snapshotData.exitPrice,
      fees: executionFees > 0 ? executionFees.toFixed(2) : data.fees,
      status: snapshotData.status,
      grossPnl: snapshotData.grossPnl,
      executions: {
        create: executions.map((execution) => ({
          action: execution.action,
          executedAt: execution.executedAt,
          quantity: execution.quantity,
          price: execution.price,
          fees: execution.fees,
        })),
      },
    },
    include: {
      executions: {
        orderBy: { executedAt: "asc" },
      },
    },
  });

  return NextResponse.json({ trade: serializeTrade(trade) }, { status: 201 });
}
