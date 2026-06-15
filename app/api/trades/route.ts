import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  cleanupDuplicateTickerTrades,
  executionCreateData,
  executionsForTrade,
  mergeTickerTrades,
  TradeApiError,
} from "@/lib/trade-tickers";
import {
  derivedTradeWriteData,
  legacyExecutionsFromTrade,
  parseTradeInput,
  serializeTrade,
} from "@/lib/trades";

export async function GET(request: Request) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  await cleanupDuplicateTickerTrades(user.id);

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
  const assetClass = data.assetClass;
  const symbol = data.symbol;
  const side = data.side;
  const tradeDate = data.tradeDate;
  const quantity = data.quantity;
  const entryPrice = data.entryPrice;
  const fees = data.fees;
  const status = data.status;

  const executions =
    parsedExecutions ??
    legacyExecutionsFromTrade({
      side,
      tradeDate,
      quantity,
      entryPrice,
      exitDate: data.exitDate,
      exitPrice: data.exitPrice,
      fees,
      status,
    });
  const derived = derivedTradeWriteData(side, executions, {
    tradeDate,
    entryPrice,
    fees,
  });
  if (!derived.ok) {
    return NextResponse.json({ errors: derived.errors }, { status: 400 });
  }

  let trade;
  try {
    trade = await prisma.$transaction(async (tx) => {
      const existing = await mergeTickerTrades(tx, {
        userId: user.id,
        assetClass,
        symbol,
      });

      if (!existing) {
        return tx.trade.create({
          data: {
            userId: user.id,
            assetClass,
            symbol,
            side,
            ...derived.data,
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
      }

      if (existing.side !== side) {
        throw new TradeApiError([
          `Existing ${symbol} ticker is ${existing.side}. Add executions with the same side before recording an opposite-side ticker.`,
        ]);
      }

      const appendedExecutions = [...executionsForTrade(existing), ...executions];
      const appendedDerived = derivedTradeWriteData(existing.side, appendedExecutions, {
        tradeDate: existing.tradeDate,
        entryPrice: existing.entryPrice,
        fees: existing.fees,
      });
      if (!appendedDerived.ok) {
        throw new TradeApiError(appendedDerived.errors);
      }

      await tx.tradeExecution.deleteMany({ where: { tradeId: existing.id } });
      await tx.tradeExecution.createMany({
        data: executionCreateData(existing.id, appendedExecutions),
      });

      return tx.trade.update({
        where: { id: existing.id },
        data: appendedDerived.data,
        include: {
          executions: {
            orderBy: { executedAt: "asc" },
          },
        },
      });
    });
  } catch (error) {
    if (error instanceof TradeApiError) {
      return NextResponse.json({ errors: error.errors }, { status: error.status });
    }

    throw error;
  }

  return NextResponse.json({ trade: serializeTrade(trade) }, { status: 201 });
}
