import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireApiUser(request: Request) {
  const user = await getCurrentUser(request);

  if (!user) {
    return {
      user: null,
      response: jsonError("Authentication required.", 401),
    };
  }

  return { user, response: null };
}
