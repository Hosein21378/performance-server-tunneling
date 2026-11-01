import { randomBytes } from "node:crypto";
import { and, eq, gt, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { networkNodes, nodeJoinTokens } from "@/db/schema";
import { hashToken, validToken } from "@/lib/nodes";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 4096) {
    return Response.json({ error: "Request too large" }, { status: 413 });
  }
  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  if (!validToken(input.token)) {
    return Response.json({ error: "Invalid or expired enrollment token" }, { status: 401 });
  }
  const hostname = typeof input.hostname === "string" && /^[a-zA-Z0-9_.-]{1,253}$/.test(input.hostname)
    ? input.hostname : null;
  const agentToken = randomBytes(32).toString("hex");
  const now = new Date();

  // The conditional UPDATE is the atomic one-time-use check, even with concurrent requests.
  const nodeId = await db.transaction(async (tx) => {
    const [join] = await tx.update(nodeJoinTokens).set({ usedAt: now }).where(and(
      eq(nodeJoinTokens.tokenHash, hashToken(input.token as string)),
      isNull(nodeJoinTokens.usedAt),
      isNotNull(nodeJoinTokens.nodeId),
      gt(nodeJoinTokens.expiresAt, now),
    )).returning({ nodeId: nodeJoinTokens.nodeId });
    if (!join?.nodeId) return null;
    const [node] = await tx.update(networkNodes).set({
      agentTokenHash: hashToken(agentToken),
      agentHostname: hostname,
      agentVersion: "1.0.0",
      lastSeenAt: now,
      updatedAt: now,
      status: "online",
    }).where(eq(networkNodes.id, join.nodeId)).returning({ id: networkNodes.id });
    if (!node) throw new Error("Enrollment target was removed");
    return node.id;
  });
  if (!nodeId) {
    return Response.json({ error: "Invalid, expired, or already used enrollment token" }, { status: 401 });
  }
  return Response.json({ ok: true, nodeId, agentToken }, { headers: { "Cache-Control": "no-store" } });
}
