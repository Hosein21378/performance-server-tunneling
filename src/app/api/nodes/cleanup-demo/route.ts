import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { networkNodes, networkTunnels } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

// Exact records seeded by the original preview. Never delete a modified or
// enrolled node, or a node that is referenced by a non-preview tunnel.
const examples = [
  { code: "IR-TEH-01", name: "هستهٔ تهران", overlayIp: "10.84.0.1/24" },
  { code: "DE-FRA-01", name: "لبهٔ فرانکفورت", overlayIp: "10.84.0.2/24" },
  { code: "NL-AMS-01", name: "لبهٔ آمستردام", overlayIp: "10.84.0.3/24" },
  { code: "TR-IST-01", name: "لبهٔ استانبول", overlayIp: "10.84.0.4/24" },
] as const;
const previewRoutes: Record<string, string> = {
  "DE-FRA-01": "مسیر تهران ـ فرانکفورت",
  "NL-AMS-01": "مسیر تهران ـ آمستردام",
  "TR-IST-01": "مسیر تهران ـ استانبول",
};

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth) return auth;

  const result = await db.transaction(async (tx) => {
    const oldNodes = await tx.select().from(networkNodes).where(and(
      or(...examples.map((item) => and(
        eq(networkNodes.code, item.code),
        eq(networkNodes.name, item.name),
        eq(networkNodes.overlayIp, item.overlayIp),
      ))),
      isNull(networkNodes.publicIp),
      isNull(networkNodes.agentTokenHash),
      isNull(networkNodes.lastSeenAt),
    )).for("update");
    if (!oldNodes.length) return { removedNodes: 0, removedTunnels: 0, skippedNodes: 0 };

    const routes = await tx.select().from(networkTunnels).for("update");
    const byId = new Map(oldNodes.map((node) => [node.id, node]));
    const isPreviewRoute = (route: typeof networkTunnels.$inferSelect) => {
      const source = byId.get(route.sourceNodeId);
      const target = byId.get(route.targetNodeId);
      return source?.code === "IR-TEH-01" && !!target && previewRoutes[target.code] === route.name;
    };
    const removable = oldNodes.filter((node) => routes
      .filter((route) => route.sourceNodeId === node.id || route.targetNodeId === node.id)
      .every(isPreviewRoute));
    const ids = removable.map((node) => node.id);
    const routeIds = routes.filter((route) => isPreviewRoute(route) &&
      (ids.includes(route.sourceNodeId) || ids.includes(route.targetNodeId))).map((route) => route.id);
    const removedRoutes = routeIds.length
      ? await tx.delete(networkTunnels).where(inArray(networkTunnels.id, routeIds)).returning({ id: networkTunnels.id })
      : [];
    const removedNodes = ids.length
      ? await tx.delete(networkNodes).where(inArray(networkNodes.id, ids)).returning({ id: networkNodes.id })
      : [];
    return { removedNodes: removedNodes.length, removedTunnels: removedRoutes.length, skippedNodes: oldNodes.length - ids.length };
  });

  return Response.json({ ok: true, ...result });
}
