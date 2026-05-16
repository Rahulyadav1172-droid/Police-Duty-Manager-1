import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dutyPointsTable = pgTable("duty_points", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDutyPointSchema = createInsertSchema(dutyPointsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertDutyPoint = z.infer<typeof insertDutyPointSchema>;
export type DutyPoint = typeof dutyPointsTable.$inferSelect;
