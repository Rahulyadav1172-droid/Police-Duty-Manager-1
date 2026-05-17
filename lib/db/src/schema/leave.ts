import { pgTable, serial, integer, date, text, pgEnum, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { personnelTable } from "./personnel";

export const leaveTypeEnum = pgEnum("leave_type", [
  "sick_leave",
  "earned_leave",
  "casual_leave",
  "absent",
]);

export const leaveStatusEnum = pgEnum("leave_status", [
  "pending",
  "approved",
  "rejected",
]);

export const leaveTable = pgTable("leave_records", {
  id: serial("id").primaryKey(),
  personnelId: integer("personnel_id")
    .notNull()
    .references(() => personnelTable.id, { onDelete: "cascade" }),
  leaveType: leaveTypeEnum("leave_type").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: text("reason"),
  status: leaveStatusEnum("status").notNull().default("approved"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLeaveSchema = createInsertSchema(leaveTable).omit({
  id: true,
  createdAt: true,
});
export type InsertLeave = z.infer<typeof insertLeaveSchema>;
export type Leave = typeof leaveTable.$inferSelect;
