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
  status: text("status").notNull().default("online"),
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
