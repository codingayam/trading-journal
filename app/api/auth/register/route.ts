import { NextResponse } from "next/server";
import {
  createSession,
  createUserWithPassword,
  isValidPassword,
  sessionCookieName,
  sessionCookieOptions,
} from "@/lib/auth";
import { jsonError } from "@/lib/api";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!name || !email || !isValidPassword(password)) {
    return jsonError("Name, email, and a valid password are required.", 400);
  }

  try {
    const user = await createUserWithPassword({ name, email, password });
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
  } catch {
    return jsonError("Unable to create account.", 400);
  }
}
