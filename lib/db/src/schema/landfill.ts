import { pgTable, serial, text, real, timestamp, integer, numeric } from "drizzle-orm/pg-core";

export const sitesTable = pgTable("sites", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type"),
  region: text("region"),
  status: text("status").notNull().default("active"),
  capacity: real("capacity").default(0),
  used: real("used").default(0),
  acceptedWaste: text("accepted_waste").default("[]"),
});

export const wasteTypesTable = pgTable("waste_types", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  unit: text("unit").default("t"),
  tariff: real("tariff").default(0),
});

export const clientsTable = pgTable("clients", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  clientType: text("client_type"),
  type: text("type"),
  creditLimit: real("credit_limit").default(0),
  consumed: real("consumed").default(0),
  weightLimitYear: real("weight_limit_year").default(0),
});

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  siteId: text("site_id"),
  role: text("role"),
});

export const dischargesTable = pgTable("discharges", {
  id: serial("id").primaryKey(),
  ts: timestamp("ts").notNull().defaultNow(),
  siteId: text("site_id"),
  clientId: text("client_id"),
  clientName: text("client_name"),
  truck: text("truck"),
  wasteType: text("waste_type"),
  gross: real("gross").default(0),
  tare: real("tare").default(0),
  net: real("net").default(0),
  total: real("total").default(0),
  status: text("status").notNull().default("pending"),
  payMethod: text("pay_method"),
  opId: text("op_id"),
  opType: text("op_type"),
  correctionReason: text("correction_reason"),
});

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  clientId: text("client_id"),
  totalAmount: real("total_amount").notNull().default(0),
  paidAmount: real("paid_amount").notNull().default(0),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  dueAt: timestamp("due_at"),
});
