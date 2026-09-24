import { pgTable, uuid, text, timestamp, integer, jsonb, boolean, primaryKey, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  emailIdx: uniqueIndex("users_email_idx").on(t.email),
}));

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  plan: text("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  slugIdx: uniqueIndex("organizations_slug_idx").on(t.slug),
}));

export const memberships = pgTable("memberships", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // owner | admin | member
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.orgId] }),
}));

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").notNull(),
  prefix: text("prefix").notNull(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  keyHashIdx: uniqueIndex("api_keys_key_hash_idx").on(t.keyHash),
}));

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull(),
  name: text("name").notNull(),
  properties: jsonb("properties"),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
});

export const eventUsage = pgTable("event_usage", {
  orgId: uuid("org_id").notNull(),
  period: text("period").notNull(), // e.g. "2026-09"
  eventsIngested: integer("events_ingested").notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.orgId, t.period] }),
}));

export const rollupsHourly = pgTable("rollups_hourly", {
  orgId: uuid("org_id").notNull(),
  eventName: text("event_name").notNull(),
  bucketStart: timestamp("bucket_start").notNull(),
  count: integer("count").notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.orgId, t.bucketStart, t.eventName] }),
}));

export const rollupsDaily = pgTable("rollups_daily", {
  orgId: uuid("org_id").notNull(),
  eventName: text("event_name").notNull(),
  bucketStart: timestamp("bucket_start").notNull(),
  count: integer("count").notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.orgId, t.bucketStart, t.eventName] }),
}));

export const webhookEvents = pgTable("webhook_events", {
  stripeEventId: text("stripe_event_id").primaryKey(),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
}, (t) => ({
  tokenHashIdx: uniqueIndex("refresh_tokens_token_hash_idx").on(t.tokenHash),
}));
