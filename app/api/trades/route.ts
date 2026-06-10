import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  const trades = await prisma.trade.findMany({
    where: { userId: user.id },
    orderBy: { tradeDate: "desc" },
  });

  return NextResponse.json({ trades });
}
