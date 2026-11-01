import { eq } from "drizzle-orm";
import { db } from "@/db";
import { networkNodes } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { publicNode, validateNodeInput } from "@/lib/nodes";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const auth = await requireAdmin(request);
  if (auth) return auth;
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return Response.json({ error: "شناسهٔ سرور معتبر نیست." }, { status: 400 });
  }
  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: "درخواست معتبر نیست." }, { status: 400 });
  }
  const input = validateNodeInput(body);
  if (!input.ok) return Response.json({ error: input.error }, { status: 400 });
  const [node] = await db.update(networkNodes)
    .set({ name: input.name, publicIp: input.publicIp, updatedAt: new Date() })
    .where(eq(networkNodes.id, id)).returning();
  if (!node) return Response.json({ error: "سرور پیدا نشد." }, { status: 404 });
  return Response.json({ node: publicNode(node) });
}

export async function DELETE(request: Request, { params }: Context) {
  const auth = await requireAdmin(request);
  if (auth) return auth;
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return Response.json({ error: "شناسهٔ سرور معتبر نیست." }, { status: 400 });
  }
  const [node] = await db.delete(networkNodes).where(eq(networkNodes.id, id)).returning({ id: networkNodes.id });
  if (!node) return Response.json({ error: "سرور پیدا نشد." }, { status: 404 });
  return Response.json({ ok: true });
}
