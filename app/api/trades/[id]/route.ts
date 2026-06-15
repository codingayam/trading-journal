import { NextResponse } from "next/server";
import { jsonError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  derivedTradeWriteData,
  legacyExecutionsFromTrade,
  parseTradeInput,
  serializeTrade,
} from "@/lib/trades";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: Context) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  const body = await request.json().catch(() => null);
  const supportedFields = [
    "assetClass",
    "symbol",
    "side",
    "quantity",
    "entryDateTime",
    "tradeDate",
    "entryPrice",
    "exitDateTime",
    "exitDate",
    "exitPrice",
    "fees",
    "status",
    "executions",
  ];

  if (
    !body ||
    typeof body !== "object" ||
    !supportedFields.some((field) => Object.hasOwn(body, field))
  ) {
    return jsonError("No supported trade fields provided.", 400);
  }

  const { id } = await context.params;

  const existing = await prisma.trade.findFirst({
    where: {
      id,
      userId: user.id,
    },
    include: {
      executions: {
        orderBy: { executedAt: "asc" },
      },
    },
  });

  if (!existing) {
    return jsonError("Trade not found.", 404);
  }

  const parsed = parseTradeInput(body, "update", existing);

  if (!parsed.ok) {
    return NextResponse.json({ errors: parsed.errors }, { status: 400 });
  }

  if (Object.keys(parsed.data).length === 0) {
    return jsonError("No supported trade fields provided.", 400);
  }

  const { executions: parsedExecutions, ...parsedTradeData } = parsed.data;
  const legacyExecutionFields = [
    "side",
    "quantity",
    "entryDateTime",
    "tradeDate",
    "entryPrice",
    "exitDateTime",
    "exitDate",
    "exitPrice",
    "fees",
    "status",
  ].some((field) => Object.hasOwn(body, field));
  const merged = {
    ...existing,
    ...parsedTradeData,
    tradeDate: parsedTradeData.tradeDate ?? existing.tradeDate,
    entryPrice: parsedTradeData.entryPrice ?? existing.entryPrice,
    fees: parsedTradeData.fees ?? existing.fees,
    exitDate: parsedTradeData.exitDate !== undefined ? parsedTradeData.exitDate : existing.exitDate,
    exitPrice: parsedTradeData.exitPrice !== undefined ? parsedTradeData.exitPrice : existing.exitPrice,
  };
  const existingExecutions =
    existing.executions.length > 0
      ? existing.executions
      : legacyExecutionsFromTrade({
          side: existing.side,
          tradeDate: existing.tradeDate,
          quantity: existing.quantity,
          entryPrice: existing.entryPrice,
          exitDate: existing.exitDate,
          exitPrice: existing.exitPrice,
          fees: existing.fees,
          status: existing.status,
        });
  const executions =
    parsedExecutions ??
    (legacyExecutionFields
      ? legacyExecutionsFromTrade({
          side: merged.side,
          tradeDate: merged.tradeDate,
          quantity: merged.quantity,
          entryPrice: merged.entryPrice,
          exitDate: merged.exitDate,
          exitPrice: merged.exitPrice,
          fees: merged.fees,
          status: merged.status,
        })
      : existingExecutions);
  const derived = derivedTradeWriteData(merged.side, executions, {
    tradeDate: merged.tradeDate,
    entryPrice: merged.entryPrice,
    fees: merged.fees,
  });
  if (!derived.ok) {
    return NextResponse.json({ errors: derived.errors }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const update = await tx.trade.updateMany({
      where: {
        id,
        userId: user.id,
      },
      data: {
        ...parsedTradeData,
        ...derived.data,
      },
    });

    if (update.count > 0 && (parsedExecutions !== undefined || legacyExecutionFields)) {
      await tx.tradeExecution.deleteMany({ where: { tradeId: id } });
      await tx.tradeExecution.createMany({
        data: executions.map((execution) => ({
          tradeId: id,
          action: execution.action,
          executedAt: execution.executedAt,
          quantity: execution.quantity,
          price: execution.price,
          fees: execution.fees,
        })),
      });
    }

    return update;
  });

  if (result.count === 0) {
    return jsonError("Trade not found.", 404);
  }

  const trade = await prisma.trade.findFirstOrThrow({
    where: {
      id,
      userId: user.id,
    },
    include: {
      executions: {
        orderBy: { executedAt: "asc" },
      },
    },
  });

  return NextResponse.json({ trade: serializeTrade(trade) });
}

export async function DELETE(request: Request, context: Context) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  const { id } = await context.params;
  const result = await prisma.trade.deleteMany({
    where: {
      id,
      userId: user.id,
    },
  });

  if (result.count === 0) {
    return jsonError("Trade not found.", 404);
  }

  return new NextResponse(null, { status: 204 });
}
