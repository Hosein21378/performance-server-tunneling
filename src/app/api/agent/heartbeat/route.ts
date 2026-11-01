import { eq } from "drizzle-orm";
import { db } from "@/db";
import { networkNodes } from "@/db/schema";
import { hashToken, validToken } from "@/lib/nodes";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const bearer = request.headers.get("authorization") || "";
  const token = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
  if (!validToken(token)) {
    return Response.json({ error: "Invalid agent credentials" }, { status: 401 });
  }
  const now = new Date();
  const [node] = await db.update(networkNodes).set({
    lastSeenAt: now,
    updatedAt: now,
    status: "online",
  }).where(eq(networkNodes.agentTokenHash, hashToken(token))).returning({ id: networkNodes.id });
  if (!node) return Response.json({ error: "Invalid agent credentials" }, { status: 401 });
  return Response.json({ ok: true, nextHeartbeatSeconds: 30 }, { headers: { "Cache-Control": "no-store" } });
}
