import { eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { isPasswordConfigured, isValidSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { networkNodes, networkTunnels } from "@/db/schema";
import DashboardClient from "./dashboard-client";
import LoginClient from "./login-client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!isValidSessionToken(session)) {
    return <LoginClient passwordConfigured={isPasswordConfigured()} />;
  }

  await db.execute(sql`select 1`);

  const nodes = await db.select().from(networkNodes).orderBy(networkNodes.id);
  const tunnels = await db
    .select({
      id: networkTunnels.id,
      name: networkTunnels.name,
      targetNodeId: networkTunnels.targetNodeId,
      targetCode: networkNodes.code,
      targetCity: networkNodes.city,
      targetCountry: networkNodes.country,
      protocol: networkTunnels.protocol,
      status: networkTunnels.status,
      latencyMs: networkTunnels.latencyMs,
      downloadMbps: networkTunnels.downloadMbps,
      uploadMbps: networkTunnels.uploadMbps,
    })
    .from(networkTunnels)
    .innerJoin(networkNodes, eq(networkTunnels.targetNodeId, networkNodes.id))
    .orderBy(networkTunnels.id);

  return (
    <DashboardClient
      initialNodes={nodes.map((node) => ({
        id: node.id,
        code: node.code,
        name: node.name,
        country: node.country,
        city: node.city,
        role: node.role,
        overlayIp: node.overlayIp,
        status: node.status,
        latencyMs: node.latencyMs,
        loadPercent: node.loadPercent,
        downloadMbps: node.downloadMbps,
        uploadMbps: node.uploadMbps,
        createdAt: node.createdAt?.toISOString() ?? "",
      }))}
      initialTunnels={tunnels}
    />
  );
}
