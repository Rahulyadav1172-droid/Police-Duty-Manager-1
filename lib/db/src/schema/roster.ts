import { pgTable, serial, integer, timestamp, text, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { personnelTable } from "./personnel";
import { dutyPointsTable } from "./duty-points";

export const dutyTypeEnum = pgEnum("duty_type", ["unlimited", "fixed"]);
export const dutyStatusEnum = pgEnum("duty_status", ["active", "released", "expired"]);

export const rosterTable = pgTable("duty_roster", {
  id: serial("id").primaryKey(),
  personnelId: integer("personnel_id")
    .notNull()
    .references(() => personnelTable.id, { onDelete: "cascade" }),
  dutyPointId: integer("duty_point_id")
    .notNull()
    .references(() => dutyPointsTable.id, { onDelete: "cascade" }),
  dutyType: dutyTypeEnum("duty_type").notNull(),
  startDateTime: timestamp("start_date_time", { withTimezone: true }).notNull(),
  endDateTime: timestamp("end_date_time", { withTimezone: true }),
  status: dutyStatusEnum("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRosterSchema = createInsertSchema(rosterTable).omit({
  id: true,
  status: true,
  createdAt: true,
});
export type InsertRoster = z.infer<typeof insertRosterSchema>;
export type Roster = typeof rosterTable.$inferSelect;
