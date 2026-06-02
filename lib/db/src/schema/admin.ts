import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const adminCredentialsTable = pgTable("admin_credentials", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
