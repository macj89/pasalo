import { NextResponse } from "next/server";
import { AUTH_COOKIE, createSession, passwordMatches } from "@/lib/crypto";
import { clearLoginAttempts, loginAllowed, recordFailedLogin } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limit = loginAllowed(request.headers);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos antes de volver a intentarlo." },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } },
    );
  }
  const body = await request.json().catch(() => ({}));
  if (typeof body.password !== "string" || !passwordMatches(body.password)) {
    recordFailedLogin(limit.key);
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }
  clearLoginAttempts(limit.key);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, createSession(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return response;
}
