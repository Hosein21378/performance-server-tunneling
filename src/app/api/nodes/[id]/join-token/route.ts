import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { networkNodes, nodeJoinTokens } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { agentScriptHash, issueJoinToken } from "@/lib/nodes";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth) return auth;
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return Response.json({ error: "شناسهٔ سرور معتبر نیست." }, { status: 400 });
  }
  let scriptSha256: string;
  try { scriptSha256 = await agentScriptHash(); } catch {
    return Response.json({ error: "فایل public/rabt-agent.sh روی سرور پنل پیدا نشد؛ آن را به مخزن و استقرار اضافه کنید." }, { status: 503 });
  }
  const enrollment = await db.transaction(async (tx) => {
    const [node] = await tx.select().from(networkNodes).where(eq(networkNodes.id, id)).for("update");
    if (!node) return null;
    await tx.update(nodeJoinTokens).set({ usedAt: new Date() }).where(
      and(eq(nodeJoinTokens.nodeId, id), isNull(nodeJoinTokens.usedAt)),
    );
    return issueJoinToken(tx, node);
  });
  if (!enrollment) return Response.json({ error: "سرور پیدا نشد." }, { status: 404 });
  return Response.json({ enrollment: { ...enrollment, scriptSha256 } }, { headers: { "Cache-Control": "no-store" } });
}
