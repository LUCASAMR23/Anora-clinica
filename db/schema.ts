import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const clinics = sqliteTable("clinics", {
  id: text("id").primaryKey(), name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const members = sqliteTable("members", {
  userId: text("user_id").primaryKey(), clinicId: text("clinic_id").notNull().references(() => clinics.id),
  displayName: text("display_name").notNull(), email: text("email").notNull(),
  role: text("role", { enum: ["admin", "manager", "doctor", "viewer"] }).notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [index("members_clinic_idx").on(t.clinicId)]);

export const memberInvites = sqliteTable("member_invites", {
  email: text("email").primaryKey(), clinicId: text("clinic_id").notNull().references(() => clinics.id),
  displayName: text("display_name").notNull(), role: text("role", { enum: ["admin", "manager", "doctor", "viewer"] }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [index("member_invites_clinic_idx").on(t.clinicId)]);

export const products = sqliteTable("products", {
  id: text("id").primaryKey(), clinicId: text("clinic_id").notNull().references(() => clinics.id),
  name: text("name").notNull(), category: text("category").notNull(), unit: text("unit").notNull(),
  minMilli: integer("min_milli").notNull().default(0), active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [uniqueIndex("products_clinic_name_unit_unique").on(t.clinicId, t.name, t.unit)]);

export const lots = sqliteTable("lots", {
  id: text("id").primaryKey(), clinicId: text("clinic_id").notNull().references(() => clinics.id),
  productId: text("product_id").notNull().references(() => products.id), code: text("code").notNull(),
  expiryDate: text("expiry_date").notNull(), supplier: text("supplier"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [
  uniqueIndex("lots_clinic_product_code_unique").on(t.clinicId, t.productId, t.code),
  index("lots_fefo_idx").on(t.clinicId, t.productId, t.expiryDate),
]);

export const trips = sqliteTable("trips", {
  id: text("id").primaryKey(), clinicId: text("clinic_id").notNull().references(() => clinics.id),
  destination: text("destination").notNull(), responsibleId: text("responsible_id").notNull().references(() => members.userId),
  departureDate: text("departure_date").notNull(), returnDate: text("return_date").notNull(),
  status: text("status", { enum: ["planning", "travel", "closed", "cancelled"] }).notNull().default("planning"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(), closedAt: integer("closed_at", { mode: "timestamp_ms" }),
}, (t) => [index("trips_clinic_status_idx").on(t.clinicId, t.status)]);

export const tripItems = sqliteTable("trip_items", {
  id: text("id").primaryKey(), tripId: text("trip_id").notNull().references(() => trips.id),
  productId: text("product_id").notNull().references(() => products.id), plannedMilli: integer("planned_milli").notNull(),
}, (t) => [uniqueIndex("trip_item_product_unique").on(t.tripId, t.productId)]);

export const tripAllocations = sqliteTable("trip_allocations", {
  id: text("id").primaryKey(), tripId: text("trip_id").notNull().references(() => trips.id),
  lotId: text("lot_id").notNull().references(() => lots.id), productId: text("product_id").notNull().references(() => products.id), sentMilli: integer("sent_milli").notNull(),
}, (t) => [index("trip_allocations_trip_idx").on(t.tripId)]);

export const stockMovements = sqliteTable("stock_movements", {
  id: text("id").primaryKey(), clinicId: text("clinic_id").notNull().references(() => clinics.id),
  lotId: text("lot_id").notNull().references(() => lots.id), tripId: text("trip_id").references(() => trips.id),
  location: text("location", { enum: ["clinic", "trip"] }).notNull(),
  type: text("type", { enum: ["receipt", "dispatch", "usage", "return", "loss", "adjustment"] }).notNull(),
  deltaMilli: integer("delta_milli").notNull(), reason: text("reason"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(), createdBy: text("created_by").notNull().references(() => members.userId),
}, (t) => [index("stock_movements_balance_idx").on(t.clinicId, t.location, t.tripId, t.lotId), index("stock_movements_created_idx").on(t.clinicId, t.createdAt)]);

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(), clinicId: text("clinic_id").notNull().references(() => clinics.id), actorId: text("actor_id").notNull().references(() => members.userId),
  action: text("action").notNull(), entityType: text("entity_type").notNull(), entityId: text("entity_id").notNull(), detail: text("detail"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [index("audit_events_clinic_idx").on(t.clinicId, t.createdAt)]);
