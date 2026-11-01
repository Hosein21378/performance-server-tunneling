import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { isValidSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { nodeJoinTokens, networkNodes } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function requireSession() {
  const cookieStore = await cookies();
  if (!isValidSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value)) {
    return Response.json({ error: "ابتدا وارد پنل شوید." }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const auth = await requireSession();
  if (auth) return auth;

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) {
    return Response.json({ error: "توکن لازم است." }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const [t] = await db
    .select()
    .from(nodeJoinTokens)
    .where(eq(nodeJoinTokens.tokenHash, tokenHash))
    .limit(1);

  if (!t) {
    return Response.json({ error: "توکن نامعتبر است." }, { status: 404 });
  }
  if (t.usedAt) {
    return Response.json({ error: "توکن قبلاً استفاده شده است." }, { status: 409 });
  }
  if (new Date(String(t.expiresAt)) <= new Date()) {
    return Response.json({ error: "توکن منقضی شده است." }, { status: 410 });
  }

  await db.update(nodeJoinTokens).set({ usedAt: new Date() }).where(eq(nodeJoinTokens.id, t.id));

  const code = `${t.name.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-")}-${Date.now()}`;

  const [node] = await db
    .insert(networkNodes)
    .values({
      code,
      name: t.name,
      country: t.country,
      city: t.city,
      role: t.role,
      overlayIp: t.overlayIp,
      status: "pending",
      latencyMs: 0,
      loadPercent: 0,
      downloadMbps: 0,
      uploadMbps: 0,
    })
    .returning();

  return Response.json({ ok: true, node });
}
