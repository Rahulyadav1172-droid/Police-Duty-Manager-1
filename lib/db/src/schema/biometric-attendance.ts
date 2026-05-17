import { pgTable, serial, integer, timestamp, text, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { personnelTable } from "./personnel";

export const punchTypeEnum = pgEnum("punch_type", ["IN", "OUT"]);

export const biometricAttendanceTable = pgTable("biometric_attendance", {
  id: serial("id").primaryKey(),
  personnelId: integer("personnel_id")
    .notNull()
    .references(() => personnelTable.id, { onDelete: "cascade" }),
  punchTime: timestamp("punch_time", { withTimezone: true }).notNull(),
  punchType: punchTypeEnum("punch_type").notNull(),
  deviceId: text("device_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBiometricSchema = createInsertSchema(biometricAttendanceTable).omit({
  id: true,
  createdAt: true,
});
export type InsertBiometric = z.infer<typeof insertBiometricSchema>;
export type BiometricAttendance = typeof biometricAttendanceTable.$inferSelect;
