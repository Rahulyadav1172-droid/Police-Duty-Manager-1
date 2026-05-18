import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const employeeProfilesTable = pgTable("employee_profiles", {
  id: serial("id").primaryKey(),
  pno: text("pno").notNull().unique(),
  name: text("name").notNull(),
  mobileNumber: text("mobile_number").notNull(),
  fatherName: text("father_name").notNull(),
  motherName: text("mother_name").notNull(),
  gender: text("gender").notNull(),
  dob: text("dob").notNull(),
  dateOfJoining: text("date_of_joining").notNull(),
  dateOfCurrentPosting: text("date_of_current_posting").notNull(),
  rank: text("rank").notNull(),
  ehrmsCode: text("ehrms_code"),
  photoUrl: text("photo_url"),
  characterRollPhotoUrl: text("character_roll_photo_url"),
  permanentAddress: text("permanent_address"),
  pinCode: text("pin_code"),
  policeStation: text("police_station"),
  homeDistrict: text("home_district"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EmployeeProfile = typeof employeeProfilesTable.$inferSelect;
export type InsertEmployeeProfile = typeof employeeProfilesTable.$inferInsert;
