import { pgTable, text, serial, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rankEnum = pgEnum("rank", [
  "Constable",
  "Head Constable",
  "Sub-Inspector",
  "Inspector",
]);

export const personnelTable = pgTable("personnel", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  beltNumber: text("belt_number").notNull().unique(),
  mobileNumber: text("mobile_number").notNull(),
  rank: rankEnum("rank").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPersonnelSchema = createInsertSchema(personnelTable).omit({
  id: true,
  createdAt: true,
});
export type InsertPersonnel = z.infer<typeof insertPersonnelSchema>;
export type Personnel = typeof personnelTable.$inferSelect;
