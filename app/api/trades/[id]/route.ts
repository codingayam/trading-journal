import { NextResponse } from "next/server";
import { jsonError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

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
  const notes = typeof body?.notes === "string" ? body.notes : undefined;

  if (notes === undefined) {
    return jsonError("No supported trade fields provided.", 400);
  }

  const { id } = await context.params;
  const result = await prisma.trade.updateMany({
    where: {
      id,
      userId: user.id,
    },
    data: { notes },
  });

  if (result.count === 0) {
    return jsonError("Trade not found.", 404);
  }

  const trade = await prisma.trade.findFirst({
    where: {
      id,
      userId: user.id,
    },
  });

  return NextResponse.json({ trade });
}
