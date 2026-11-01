import {
  isPasswordConfigured,
  isSecureRequest,
  sessionCookieHeader,
  verifyAdminPassword,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

type AttemptState = { count: number; until: number };

const PER_CLIENT_LIMIT = 5;
const PER_CLIENT_BLOCK_MS = 30_000;
// X-Forwarded-For can be spoofed when the panel is exposed directly, so a global
// failure budget caps guessing speed no matter which client address is claimed.
const GLOBAL_WINDOW_MS = 60_000;
const GLOBAL_FAILURE_LIMIT = 30;
const FAILURE_DELAY_MS = 400;

const attempts = new Map<string, AttemptState>();
let globalFailures: number[] = [];

function clientKey(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function pruneGlobalFailures(now: number) {
  globalFailures = globalFailures.filter((time) => now - time < GLOBAL_WINDOW_MS);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  const now = Date.now();
  const key = clientKey(request);
  const state = attempts.get(key);
  pruneGlobalFailures(now);

  if ((state && state.until > now) || globalFailures.length >= GLOBAL_FAILURE_LIMIT) {
    return Response.json(
      { error: "تلاش‌های ناموفق زیاد بود؛ یک دقیقه بعد دوباره امتحان کنید." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  if (!isPasswordConfigured()) {
    return Response.json(
      { error: "گذرواژهٔ پنل روی سرور تعریف نشده است." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "درخواست ورود نامعتبر است." }, { status: 400 });
  }

  const password =
    typeof body === "object" && body !== null && "password" in body
      ? String((body as Record<string, unknown>).password ?? "").slice(0, 256)
      : "";

  if (!password || !verifyAdminPassword(password)) {
    const next: AttemptState = { count: (state?.count ?? 0) + 1, until: 0 };
    if (next.count >= PER_CLIENT_LIMIT) next.until = now + PER_CLIENT_BLOCK_MS;
    attempts.set(key, next);
    globalFailures.push(now);
    if (attempts.size > 10_000) attempts.clear();
    await sleep(FAILURE_DELAY_MS);
    return Response.json({ error: "گذرواژه اشتباه است." }, { status: 401 });
  }

  attempts.delete(key);
  return Response.json(
    { ok: true },
    { status: 200, headers: { "Set-Cookie": sessionCookieHeader(isSecureRequest(request)) } },
  );
}
