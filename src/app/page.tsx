import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { networkNodes, networkTunnels } from "@/db/schema";
import { isPasswordConfigured, isValidSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { publicNode } from "@/lib/nodes";
import DashboardClient from "./dashboard-client";
import LoginClient from "./login-client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  if (!isValidSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value)) {
    return <LoginClient passwordConfigured={isPasswordConfigured()} />;
  }
  const nodes = await db.select().from(networkNodes).orderBy(networkNodes.id);
  const tunnels = await db.select({
    id: networkTunnels.id,
    name: networkTunnels.name,
    status: networkTunnels.status,
    protocol: networkTunnels.protocol,
    sourceNodeId: networkTunnels.sourceNodeId,
    targetNodeId: networkTunnels.targetNodeId,
    targetName: networkNodes.name,
  }).from(networkTunnels)
    .innerJoin(networkNodes, eq(networkTunnels.targetNodeId, networkNodes.id))
    .orderBy(networkTunnels.id);
  return <DashboardClient initialNodes={nodes.map(publicNode)} initialTunnels={tunnels} />;
}
