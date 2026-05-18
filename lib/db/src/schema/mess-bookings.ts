import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const messBookingsTable = pgTable("mess_bookings", {
  id:               serial("id").primaryKey(),
  refNo:            text("ref_no").notNull().unique(),
  guestName:        text("guest_name").notNull(),
  mobile:           text("mobile").notNull(),
  rooms:            text("rooms").notNull(),
  checkInDate:      text("check_in_date").notNull(),
  checkInTime:      text("check_in_time").notNull(),
  checkOutDate:     text("check_out_date").notNull(),
  checkOutTime:     text("check_out_time").notNull(),
  rentPerDay:       integer("rent_per_day"),
  foodApplicable:   text("food_applicable").notNull().$type<"yes" | "no">(),
  foodCharge:       integer("food_charge"),
  totalDays:        integer("total_days").notNull(),
  totalRoomCharge:  integer("total_room_charge").notNull(),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MessBookingRow = typeof messBookingsTable.$inferSelect;
