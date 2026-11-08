import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

const AUTH_COOKIE = "pasalo_session";

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function signaturesMatch(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function passwordMatches(candidate: string) {
  const expected = Buffer.from(env().uploadPassword);
  const received = Buffer.from(candidate);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function createSession() {
  const expires = String(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return `${expires}.${sign(expires, env().authSecret)}`;
}

export function validSession(value?: string) {
  if (!value) return false;
  const [expires, signature] = value.split(".");
  if (!expires || !signature || Number(expires) < Date.now()) return false;
  return signaturesMatch(signature, sign(expires, env().authSecret));
}

export type SharePayload = { id: string; key: string; metaKey: string; name: string; exp: number };

export function createShareToken(payload: SharePayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded, env().shareSecret)}`;
}

export function readShareToken(token: string): SharePayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || !signaturesMatch(signature, sign(encoded, env().shareSecret))) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as SharePayload;
    if (!payload.id || !payload.key || !payload.metaKey || !payload.name || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export { AUTH_COOKIE };
