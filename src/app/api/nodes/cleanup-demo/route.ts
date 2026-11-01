import { eq, or } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { isValidSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { networkNodes, networkTunnels } from "@/db/schema";

export const dynamic = "force-dynamic";

async function requireSession() {
  const cookieStore = await cookies();
  if (!isValidSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value)) {
    return Response.json({ error: "ابتدا وارد پنل شوید." }, { status: 401 });
  }
  return null;
}

const DEMO_CODES = ["IR-TEH-01", "DE-FRA-01", "NL-AMS-01", "TR-IST-01"];

export async function POST() {
  const auth = await requireSession();
  if (auth) return auth;

  const conditions = DEMO_CODES.map((code) => eq(networkNodes.code, code));

  const demoNodes = await db
    .select({ id: networkNodes.id })
    .from(networkNodes)
    .where(or(...conditions));

  let removedTunnels = 0;
  let removedNodes = 0;

  if (demoNodes.length > 0) {
    const demoIds = demoNodes.map((n) => n.id);

    const delTunnels = await db
      .delete(networkTunnels)
      .where(
        or(
          ...demoIds.map((id) => eq(networkTunnels.targetNodeId, id)),
          ...demoIds.map((id) => eq(networkTunnels.sourceNodeId, id)),
        ),
      );
    removedTunnels = delTunnels.rowCount ?? 0;

    const delNodes = await db.delete(networkNodes).where(or(...conditions));
    removedNodes = delNodes.rowCount ?? 0;
  }

  return Response.json({
    ok: true,
    removedNodes,
    removedTunnels,
    message: "داده‌های نمایشی از دیتابیس حذف شدند.",
  });
}
