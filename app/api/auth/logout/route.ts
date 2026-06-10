import { NextResponse } from "next/server";
import { invalidateSession, sessionCookieName } from "@/lib/auth";

export async function POST(request: Request) {
  await invalidateSession(request);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });

  return response;
}
