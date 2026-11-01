import { eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { isPasswordConfigured, isValidSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { networkNodes, networkTunnels } from "@/db/schema";
import DashboardClient from "./dashboard-client";
import LoginClient from "./login-client";

export const dynamic = "force-dynamic";

const previewNodes = [
  {
    code: "IR-TEH-01",
    name: "هستهٔ تهران",
    country: "ایران",
    city: "تهران",
    role: "hub",
    overlayIp: "10.84.0.1/24",
    status: "online",
    latencyMs: 0,
    loadPercent: 31,
    downloadMbps: 422,
    uploadMbps: 181,
  },
  {
    code: "DE-FRA-01",
    name: "لبهٔ فرانکفورت",
    country: "آلمان",
    city: "فرانکفورت",
    role: "edge",
    overlayIp: "10.84.0.2/24",
    status: "online",
    latencyMs: 74,
    loadPercent: 43,
    downloadMbps: 286,
    uploadMbps: 134,
  },
  {
    code: "NL-AMS-01",
    name: "لبهٔ آمستردام",
    country: "هلند",
    city: "آمستردام",
    role: "edge",
    overlayIp: "10.84.0.3/24",
    status: "online",
    latencyMs: 89,
    loadPercent: 28,
    downloadMbps: 218,
    uploadMbps: 96,
  },
  {
    code: "TR-IST-01",
    name: "لبهٔ استانبول",
    country: "ترکیه",
    city: "استانبول",
    role: "edge",
    overlayIp: "10.84.0.4/24",
    status: "online",
    latencyMs: 52,
    loadPercent: 36,
    downloadMbps: 194,
    uploadMbps: 83,
  },
];

const previewRoutes = [
  { code: "DE-FRA-01", name: "مسیر تهران ـ فرانکفورت", latencyMs: 74, downloadMbps: 286, uploadMbps: 134 },
  { code: "NL-AMS-01", name: "مسیر تهران ـ آمستردام", latencyMs: 89, downloadMbps: 218, uploadMbps: 96 },
  { code: "TR-IST-01", name: "مسیر تهران ـ استانبول", latencyMs: 52, downloadMbps: 194, uploadMbps: 83 },
];

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!isValidSessionToken(session)) {
    return <LoginClient passwordConfigured={isPasswordConfigured()} />;
  }

  await db.execute(sql`select 1`);
  await db.insert(networkNodes).values(previewNodes).onConflictDoNothing();

  const savedNodes = await db.select().from(networkNodes).orderBy(networkNodes.id);
  const hub = savedNodes.find((node) => node.role === "hub");

  if (hub) {
    const seedRoutes = previewRoutes.flatMap((route) => {
      const target = savedNodes.find((node) => node.code === route.code);
      if (!target) return [];

      return [{
        name: route.name,
        sourceNodeId: hub.id,
        targetNodeId: target.id,
        protocol: "wireguard",
        status: "active",
        latencyMs: route.latencyMs,
        downloadMbps: route.downloadMbps,
        uploadMbps: route.uploadMbps,
      }];
    });

    if (seedRoutes.length > 0) {
      await db.insert(networkTunnels).values(seedRoutes).onConflictDoNothing();
    }
  }

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
      }))}
      initialTunnels={tunnels}
    />
  );
}
