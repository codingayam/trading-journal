import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";

export const sessionCookieName = "tj_session";
const sessionDays = 30;

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string;
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidPassword(password: string) {
  return password.length >= 8;
}

export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

export async function createUserWithPassword(input: {
  name: string;
  email: string;
  password: string;
}) {
  return prisma.user.create({
    data: {
      id: randomUUID(),
      displayName: input.name.trim(),
      email: normalizeEmail(input.email),
      passwordHash: await hashPassword(input.password),
    },
  });
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);

  await prisma.authSession.create({
    data: {
      userId,
      tokenHash: tokenHash(token),
      expiresAt,
    },
  });

  return { token, expiresAt };
}

function getCookieFromHeader(header: string | null, name: string) {
  if (!header) {
    return null;
  }

  for (const part of header.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (rawKey === name) {
      return rawValue.join("=");
    }
  }

  return null;
}

export async function getSessionToken(request?: Request) {
  if (request) {
    return getCookieFromHeader(request.headers.get("cookie"), sessionCookieName);
  }

  return (await cookies()).get(sessionCookieName)?.value ?? null;
}

export async function getCurrentUser(request?: Request): Promise<CurrentUser | null> {
  const token = await getSessionToken(request);

  if (!token) {
    return null;
  }

  const session = await prisma.authSession.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await prisma.authSession.delete({ where: { id: session.id } });
    return null;
  }

  return session.user;
}

export async function authenticate(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return null;
  }

  return user;
}

export async function invalidateSession(request?: Request) {
  const token = await getSessionToken(request);

  if (!token) {
    return;
  }

  await prisma.authSession.deleteMany({
    where: { tokenHash: tokenHash(token) },
  });
}

export async function getCurrentUserWithTradingData() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: currentUser.id },
    include: {
      dayNotes: {
        orderBy: { noteDate: "desc" },
        take: 3,
      },
      sessions: {
        orderBy: { sessionDate: "desc" },
        take: 4,
      },
      setups: {
        orderBy: { name: "asc" },
      },
      trades: {
        orderBy: { tradeDate: "desc" },
        include: {
          setup: true,
          session: true,
        },
      },
    },
  });
}
