import { NextResponse } from "next/server";
import { jsonError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { parseTradeInput, serializeTrade } from "@/lib/trades";

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

  const result = await prisma.trade.updateMany({
    where: {
      id,
      userId: user.id,
    },
    data: parsed.data,
  });

  if (result.count === 0) {
    return jsonError("Trade not found.", 404);
  }

  const trade = await prisma.trade.findFirstOrThrow({
    where: {
      id,
      userId: user.id,
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
