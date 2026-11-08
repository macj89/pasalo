type Entry = { attempts: number; resetAt: number };

const attempts = new Map<string, Entry>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function clientIp(headers: Headers) {
  return headers.get("cf-connecting-ip") || headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function loginAllowed(headers: Headers) {
  const now = Date.now();
  const key = clientIp(headers);
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) return { allowed: true, key };
  return { allowed: entry.attempts < MAX_ATTEMPTS, key, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
}

export function recordFailedLogin(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { attempts: 1, resetAt: now + WINDOW_MS });
    return;
  }
  entry.attempts += 1;
}

export function clearLoginAttempts(key: string) {
  attempts.delete(key);
}
