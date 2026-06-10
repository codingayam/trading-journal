import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { jsonError } from "@/lib/api";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);

  if (!user) {
    return jsonError("Authentication required.", 401);
  }

  return NextResponse.json({ user });
}
