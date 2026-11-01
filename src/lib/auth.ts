import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "rabt_session";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export function isPasswordConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 6);
}

export function verifyAdminPassword(input: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  // Compare fixed-length digests so neither content nor length leaks through timing.
  const provided = createHash("sha256").update(input).digest();
  const wanted = createHash("sha256").update(expected).digest();
  return timingSafeEqual(provided, wanted);
}

function signingSecret() {
  // Binding the signature to the admin password invalidates every open
  // session as soon as the panel password is rotated.
  const passwordEpoch = createHash("sha256")
    .update(process.env.ADMIN_PASSWORD || "")
    .digest("hex");
  return `${process.env.SESSION_SECRET || ""}:${passwordEpoch}`;
}

function sign(payload: string) {
  return createHmac("sha256", signingSecret()).update(payload).digest("hex");
}

export function createSessionToken() {
  const payload = String(Date.now() + SESSION_TTL_MS);
  return `${payload}.${sign(payload)}`;
}

export function isValidSessionToken(token: string | undefined) {
  if (!isPasswordConfigured() || !token) return false;
  const [payload, signature, ...rest] = token.split(".");
  if (!payload || !signature || rest.length > 0) return false;

  const expected = Buffer.from(sign(payload));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length) return false;
  if (!timingSafeEqual(expected, provided)) return false;

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

export function isSecureRequest(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (forwardedProto === "https") return true;
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

export function sessionCookieHeader(secure = false) {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const secureFlag = secure ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=${createSessionToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureFlag}`;
}

export const sessionClearCookieHeader = `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
