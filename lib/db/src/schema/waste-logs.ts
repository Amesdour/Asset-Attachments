import { pgTable, serial, text, real, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const wasteLogsTable = pgTable("waste_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  weightMt: real("weight_mt").notNull(),
  wasteType: text("waste_type").notNull(),
  wasteCode: text("waste_code").notNull(),
  truckId: text("truck_id").notNull(),
  site: text("site").notNull(),
  treatmentStatus: text("treatment_status").notNull(),
  treatmentMethod: text("treatment_method").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWasteLogSchema = createInsertSchema(wasteLogsTable).omit({ id: true, createdAt: true });
export type InsertWasteLog = z.infer<typeof insertWasteLogSchema>;
export type WasteLog = typeof wasteLogsTable.$inferSelect;

export const landfillConfigTable = pgTable("landfill_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
