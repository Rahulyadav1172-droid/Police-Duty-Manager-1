import { Router, type IRouter } from "express";
import { eq, and, lte, gte } from "drizzle-orm";
import { db, leaveTable, personnelTable } from "@workspace/db";
import {
  CreateLeaveBody,
  UpdateLeaveBody,
  GetLeaveParams,
  UpdateLeaveParams,
  DeleteLeaveParams,
  ListLeaveResponse,
  GetLeaveResponse,
  UpdateLeaveResponse,
  GetActiveLeavesTodayResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function buildLeaveRecord(id: number) {
  const [record] = await db
    .select()
    .from(leaveTable)
    .where(eq(leaveTable.id, id));
  if (!record) return null;

  const [person] = await db
    .select()
    .from(personnelTable)
    .where(eq(personnelTable.id, record.personnelId));

  return {
    ...record,
    createdAt: record.createdAt.toISOString(),
    personnel: person ? { ...person, createdAt: person.createdAt.toISOString() } : undefined,
  };
}

// GET /leave/active-today  — must be before /leave/:id
router.get("/leave/active-today", async (req, res): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const records = await db
    .select()
    .from(leaveTable)
    .where(
      and(
        lte(leaveTable.startDate, today),
        gte(leaveTable.endDate, today),
        eq(leaveTable.status, "approved"),
      ),
    );

  const enriched = await Promise.all(
    records.map(async (r) => {
      const [person] = await db
        .select()
        .from(personnelTable)
        .where(eq(personnelTable.id, r.personnelId));
      return {
        ...r,
        createdAt: r.createdAt.toISOString(),
        personnel: person ? { ...person, createdAt: person.createdAt.toISOString() } : undefined,
      };
    }),
  );

  res.json(GetActiveLeavesTodayResponse.parse(enriched));
});

// GET /leave
router.get("/leave", async (req, res): Promise<void> => {
  const { personnelId, status } = req.query;

  let query = db.select().from(leaveTable).$dynamic();

  const conditions = [];
  if (personnelId) conditions.push(eq(leaveTable.personnelId, Number(personnelId)));
  if (status)      conditions.push(eq(leaveTable.status, status as any));
  if (conditions.length) query = query.where(and(...conditions));

  const records = await query.orderBy(leaveTable.startDate);

  const enriched = await Promise.all(
    records.map(async (r) => {
      const [person] = await db
        .select()
        .from(personnelTable)
        .where(eq(personnelTable.id, r.personnelId));
      return {
        ...r,
        createdAt: r.createdAt.toISOString(),
        personnel: person ? { ...person, createdAt: person.createdAt.toISOString() } : undefined,
      };
    }),
  );

  res.json(ListLeaveResponse.parse(enriched));
});

// POST /leave
router.post("/leave", async (req, res): Promise<void> => {
  const parsed = CreateLeaveBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.startDate > parsed.data.endDate) {
    res.status(400).json({ error: "Start date must be on or before end date" });
    return;
  }

  // Verify personnel exists
  const [person] = await db
    .select()
    .from(personnelTable)
    .where(eq(personnelTable.id, parsed.data.personnelId));
  if (!person) {
    res.status(400).json({ error: "Personnel not found" });
    return;
  }

  const toInsert = {
    ...parsed.data,
    startDate: parsed.data.startDate instanceof Date ? parsed.data.startDate.toISOString().slice(0, 10) : String(parsed.data.startDate),
    endDate: parsed.data.endDate instanceof Date ? parsed.data.endDate.toISOString().slice(0, 10) : String(parsed.data.endDate),
  };
  const [record] = await db.insert(leaveTable).values(toInsert).returning();
  const full = await buildLeaveRecord(record.id);
  res.status(201).json(GetLeaveResponse.parse(full));
});

// GET /leave/:id
router.get("/leave/:id", async (req, res): Promise<void> => {
  const params = GetLeaveParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const full = await buildLeaveRecord(params.data.id);
  if (!full) { res.status(404).json({ error: "Not found" }); return; }

  res.json(GetLeaveResponse.parse(full));
});

// PUT /leave/:id
router.put("/leave/:id", async (req, res): Promise<void> => {
  const params = UpdateLeaveParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const body = UpdateLeaveBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  if (body.data.startDate && body.data.endDate && body.data.startDate > body.data.endDate) {
    res.status(400).json({ error: "Start date must be on or before end date" });
    return;
  }

  const toUpdate: Record<string, unknown> = { ...body.data };
  if (body.data.startDate instanceof Date) toUpdate.startDate = body.data.startDate.toISOString().slice(0, 10);
  else if (body.data.startDate) toUpdate.startDate = String(body.data.startDate);
  if (body.data.endDate instanceof Date) toUpdate.endDate = body.data.endDate.toISOString().slice(0, 10);
  else if (body.data.endDate) toUpdate.endDate = String(body.data.endDate);

  const [updated] = await db
    .update(leaveTable)
    .set(toUpdate as any)
    .where(eq(leaveTable.id, params.data.id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }

  const full = await buildLeaveRecord(updated.id);
  res.json(UpdateLeaveResponse.parse(full));
});

// DELETE /leave/:id
router.delete("/leave/:id", async (req, res): Promise<void> => {
  const params = DeleteLeaveParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [deleted] = await db
    .delete(leaveTable)
    .where(eq(leaveTable.id, params.data.id))
    .returning();

  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).send();
});

export default router;
