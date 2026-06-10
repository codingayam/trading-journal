import { NextResponse } from "next/server";
import {
  authenticate,
  createSession,
  sessionCookieName,
  sessionCookieOptions,
} from "@/lib/auth";
import { jsonError } from "@/lib/api";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const user = await authenticate(email, password);

  if (!user) {
    return jsonError("Invalid email or password.", 401);
  }

  const session = await createSession(user.id);
  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    },
  });

  response.cookies.set(
    sessionCookieName,
    session.token,
    sessionCookieOptions(session.expiresAt),
  );

  return response;
}
