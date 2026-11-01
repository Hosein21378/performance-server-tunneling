import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { networkNodes } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { agentScriptHash, issueJoinToken, publicNode, validateNodeInput } from "@/lib/nodes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth) return auth;
  const nodes = await db.select().from(networkNodes).orderBy(networkNodes.id);
  return Response.json({ nodes: nodes.map(publicNode) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth) return auth;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "درخواست معتبر نیست." }, { status: 400 });
  }
  const input = validateNodeInput(body);
  if (!input.ok) return Response.json({ error: input.error }, { status: 400 });

  let scriptSha256: string;
  try { scriptSha256 = await agentScriptHash(); } catch {
    return Response.json({ error: "فایل public/rabt-agent.sh روی سرور پنل پیدا نشد؛ آن را به مخزن و استقرار اضافه کنید." }, { status: 503 });
  }
  const result = await db.transaction(async (tx) => {
    const [node] = await tx.insert(networkNodes).values({
      code: `SRV-${randomBytes(6).toString("hex").toUpperCase()}`,
      name: input.name,
      publicIp: input.publicIp,
      country: "",
      city: "",
      role: "edge",
      overlayIp: "",
      status: "pending",
    }).returning();
    const enrollment = await issueJoinToken(tx, node);
    return { node: publicNode(node), enrollment: { ...enrollment, scriptSha256 } };
  });
  return Response.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
}
