import {
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const networkNodes = pgTable("network_nodes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  city: text("city").notNull(),
  role: text("role").notNull().default("edge"),
  overlayIp: text("overlay_ip").notNull(),
  publicIp: text("public_ip"),
  agentTokenHash: text("agent_token_hash"),
  agentHostname: text("agent_hostname"),
  agentVersion: text("agent_version"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  status: text("status").notNull().default("pending"),
  latencyMs: integer("latency_ms").notNull().default(0),
  loadPercent: integer("load_percent").notNull().default(0),
  downloadMbps: real("download_mbps").notNull().default(0),
  uploadMbps: real("upload_mbps").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const networkTunnels = pgTable(
  "network_tunnels",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    sourceNodeId: integer("source_node_id")
      .notNull()
      .references(() => networkNodes.id, { onDelete: "cascade" }),
    targetNodeId: integer("target_node_id")
      .notNull()
      .references(() => networkNodes.id, { onDelete: "cascade" }),
    protocol: text("protocol").notNull().default("wireguard"),
    status: text("status").notNull().default("pending"),
    latencyMs: integer("latency_ms").notNull().default(0),
    downloadMbps: real("download_mbps").notNull().default(0),
    uploadMbps: real("upload_mbps").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("network_tunnels_route_name_unique").on(
      table.sourceNodeId,
      table.targetNodeId,
      table.name,
    ),
  ],
);

export const nodeJoinTokens = pgTable("node_join_tokens", {
  id: serial("id").primaryKey(),
  nodeId: integer("node_id").references(() => networkNodes.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  city: text("city").notNull(),
  role: text("role").notNull().default("edge"),
  overlayIp: text("overlay_ip").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
