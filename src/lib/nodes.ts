import { createHash, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { isIP } from "node:net";
import { db } from "@/db";
import { networkNodes, nodeJoinTokens } from "@/db/schema";

type StoredNode = typeof networkNodes.$inferSelect;
type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const JOIN_TTL_MS = 15 * 60 * 1000;
export const ONLINE_TTL_MS = 2 * 60 * 1000;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function validToken(token: unknown): token is string {
  return typeof token === "string" && /^[0-9a-f]{64}$/.test(token);
}

export function validateNodeInput(body: unknown):
  | { ok: true; name: string; publicIp: string }
  | { ok: false; error: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "اطلاعات ارسالی معتبر نیست." };
  }
  const value = body as Record<string, unknown>;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const publicIp = typeof value.publicIp === "string" ? value.publicIp.trim() : "";
  if (name.length < 2 || name.length > 100 || /[\u0000-\u001f]/.test(name)) {
    return { ok: false, error: "نام سرور باید بین ۲ تا ۱۰۰ نویسه باشد." };
  }
  if (!isIP(publicIp)) {
    return { ok: false, error: "یک آدرس IPv4 یا IPv6 معتبر، بدون پورت، وارد کنید." };
  }
  return { ok: true, name, publicIp };
}

export function publicNode(node: StoredNode) {
  const lastSeenAt = node.lastSeenAt?.toISOString() ?? null;
  const status = !node.lastSeenAt
    ? "pending"
    : Date.now() - node.lastSeenAt.getTime() <= ONLINE_TTL_MS
      ? "online"
      : "offline";
  return {
    id: node.id,
    code: node.code,
    name: node.name,
    publicIp: node.publicIp,
    status,
    agentHostname: node.agentHostname,
    agentVersion: node.agentVersion,
    lastSeenAt,
    createdAt: node.createdAt.toISOString(),
  };
}

export async function agentScriptHash() {
  const file = await readFile(path.join(process.cwd(), "public", "rabt-agent.sh"));
  return createHash("sha256").update(file).digest("hex");
}

export async function issueJoinToken(tx: DatabaseTransaction, node: StoredNode) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + JOIN_TTL_MS);
  await tx.insert(nodeJoinTokens).values({
    nodeId: node.id,
    code: node.code,
    name: node.name,
    country: node.country,
    city: node.city,
    role: node.role,
    overlayIp: node.overlayIp,
    tokenHash: hashToken(token),
    expiresAt,
  });
  return { token, expiresAt: expiresAt.toISOString() };
}
