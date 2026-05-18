import { Router, type IRouter } from "express";
import { desc, eq, like } from "drizzle-orm";
import { db, messBookingsTable } from "@workspace/db";
import {
  CreateMessBookingBody,
  UpdateMessBookingBody,
  UpdateMessBookingParams,
  DeleteMessBookingParams,
  ListMessBookingsResponse,
  ListMessBookingsResponseItem,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serialize(row: typeof messBookingsTable.$inferSelect) {
  return {
    ...row,
    rooms: JSON.parse(row.rooms) as string[],
    rentPerDay: row.rentPerDay ?? null,
    foodCharge: row.foodCharge ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function nextRefNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `APL/MESS/${year}/`;
  const rows = await db
    .select({ refNo: messBookingsTable.refNo })
    .from(messBookingsTable)
    .where(like(messBookingsTable.refNo, `${prefix}%`));
  const seq = rows.length + 1;
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

router.get("/mess-bookings", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(messBookingsTable)
    .orderBy(desc(messBookingsTable.checkInDate));
  res.json(ListMessBookingsResponse.parse(rows.map(serialize)));
});

router.post("/mess-bookings", async (req, res): Promise<void> => {
  const parsed = CreateMessBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const refNo = await nextRefNo();
  const [row] = await db
    .insert(messBookingsTable)
    .values({
      refNo,
      guestName: d.guestName,
      mobile: d.mobile,
      rooms: JSON.stringify(d.rooms),
      checkInDate: d.checkInDate,
      checkInTime: d.checkInTime,
      checkOutDate: d.checkOutDate,
      checkOutTime: d.checkOutTime,
      rentPerDay: d.rentPerDay ?? null,
      foodApplicable: d.foodApplicable,
      foodCharge: d.foodCharge ?? null,
      totalDays: d.totalDays,
      totalRoomCharge: d.totalRoomCharge,
    })
    .returning();
  res.status(201).json(ListMessBookingsResponseItem.parse(serialize(row)));
});

router.put("/mess-bookings/:id", async (req, res): Promise<void> => {
  const params = UpdateMessBookingParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateMessBookingBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const d = parsed.data;
  const [row] = await db
    .update(messBookingsTable)
    .set({
      guestName: d.guestName,
      mobile: d.mobile,
      rooms: JSON.stringify(d.rooms),
      checkInDate: d.checkInDate,
      checkInTime: d.checkInTime,
      checkOutDate: d.checkOutDate,
      checkOutTime: d.checkOutTime,
      rentPerDay: d.rentPerDay ?? null,
      foodApplicable: d.foodApplicable,
      foodCharge: d.foodCharge ?? null,
      totalDays: d.totalDays,
      totalRoomCharge: d.totalRoomCharge,
    })
    .where(eq(messBookingsTable.id, params.data.id))
    .returning();

  if (!row) { res.status(404).json({ error: "Booking not found" }); return; }
  res.json(ListMessBookingsResponseItem.parse(serialize(row)));
});

router.delete("/mess-bookings/:id", async (req, res): Promise<void> => {
  const params = DeleteMessBookingParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .delete(messBookingsTable)
    .where(eq(messBookingsTable.id, params.data.id))
    .returning();

  if (!row) { res.status(404).json({ error: "Booking not found" }); return; }
  res.status(204).end();
});

export default router;
