import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db, biometricAttendanceTable, personnelTable } from "@workspace/db";
import {
  RecordBiometricPunchBody,
  ListBiometricRecordsQueryParams,
  DeleteBiometricRecordParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function enrichRecord(
  record: typeof biometricAttendanceTable.$inferSelect,
  person?: typeof personnelTable.$inferSelect,
) {
  return {
    ...record,
    punchTime: record.punchTime.toISOString(),
    createdAt: record.createdAt.toISOString(),
    personnel: person ? { ...person, createdAt: person.createdAt.toISOString() } : undefined,
  };
}

// POST /biometric/punch
router.post("/biometric/punch", async (req, res): Promise<void> => {
  const parsed = RecordBiometricPunchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { beltNumber, punchType, punchTime, deviceId } = parsed.data;

  const [person] = await db
    .select()
    .from(personnelTable)
    .where(eq(personnelTable.beltNumber, beltNumber));

  if (!person) {
    res.status(400).json({ error: `No personnel found with belt number: ${beltNumber}` });
    return;
  }

  const [record] = await db
    .insert(biometricAttendanceTable)
    .values({
      personnelId: person.id,
      punchTime: punchTime ? new Date(punchTime as unknown as string) : new Date(),
      punchType,
      deviceId: deviceId ?? null,
    })
    .returning();

  res.status(201).json(enrichRecord(record, person));
});

// GET /biometric/today
router.get("/biometric/today", async (req, res): Promise<void> => {
  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0));
  const endOfDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));

  const records = await db
    .select()
    .from(biometricAttendanceTable)
    .where(
      and(
        gte(biometricAttendanceTable.punchTime, startOfDay),
        lte(biometricAttendanceTable.punchTime, endOfDay),
      ),
    )
    .orderBy(biometricAttendanceTable.punchTime);

  const personnelIds = [...new Set(records.map((r) => r.personnelId))];

  const personMap: Record<number, typeof personnelTable.$inferSelect> = {};
  for (const pid of personnelIds) {
    const [p] = await db.select().from(personnelTable).where(eq(personnelTable.id, pid));
    if (p) personMap[pid] = p;
  }

  const grouped: Record<number, typeof biometricAttendanceTable.$inferSelect[]> = {};
  for (const r of records) {
    if (!grouped[r.personnelId]) grouped[r.personnelId] = [];
    grouped[r.personnelId].push(r);
  }

  const summaries = personnelIds.map((pid) => {
    const personRecords = grouped[pid] ?? [];
    const inPunches = personRecords
      .filter((r) => r.punchType === "IN")
      .sort((a, b) => a.punchTime.getTime() - b.punchTime.getTime());
    const outPunches = personRecords
      .filter((r) => r.punchType === "OUT")
      .sort((a, b) => b.punchTime.getTime() - a.punchTime.getTime());

    const firstIn = inPunches[0]?.punchTime ?? null;
    const lastOut = outPunches[0]?.punchTime ?? null;
    const hoursWorked =
      firstIn && lastOut
        ? Math.max(0, (lastOut.getTime() - firstIn.getTime()) / 3600000)
        : null;

    const person = personMap[pid];
    return {
      personnelId: pid,
      personnel: person ? { ...person, createdAt: person.createdAt.toISOString() } : undefined,
      firstIn: firstIn?.toISOString() ?? null,
      lastOut: lastOut?.toISOString() ?? null,
      hoursWorked: hoursWorked !== null ? Math.round(hoursWorked * 100) / 100 : null,
      punches: personRecords.map((r) => enrichRecord(r, person)),
    };
  });

  res.json(summaries);
});

// GET /biometric/records
router.get("/biometric/records", async (req, res): Promise<void> => {
  const query = ListBiometricRecordsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const dateStr = (query.data.date as string | undefined) ?? new Date().toISOString().slice(0, 10);
  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

  const conditions: ReturnType<typeof eq>[] = [
    gte(biometricAttendanceTable.punchTime, dayStart) as unknown as ReturnType<typeof eq>,
    lte(biometricAttendanceTable.punchTime, dayEnd) as unknown as ReturnType<typeof eq>,
  ];

  const personnelId = query.data.personnelId as number | undefined;
  if (personnelId) {
    conditions.push(
      eq(biometricAttendanceTable.personnelId, personnelId) as unknown as ReturnType<typeof eq>,
    );
  }

  const records = await db
    .select()
    .from(biometricAttendanceTable)
    .where(and(...conditions))
    .orderBy(desc(biometricAttendanceTable.punchTime));

  const enriched = await Promise.all(
    records.map(async (r) => {
      const [person] = await db
        .select()
        .from(personnelTable)
        .where(eq(personnelTable.id, r.personnelId));
      return enrichRecord(r, person);
    }),
  );

  res.json(enriched);
});

// DELETE /biometric/records/:id
router.delete("/biometric/records/:id", async (req, res): Promise<void> => {
  const params = DeleteBiometricRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [deleted] = await db
    .delete(biometricAttendanceTable)
    .where(eq(biometricAttendanceTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.status(204).send();
});

export default router;
