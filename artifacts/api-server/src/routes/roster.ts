import { Router, type IRouter } from "express";
import { eq, and, isNull, lt, not, desc, sql, count as drizzleCount } from "drizzle-orm";
import { db, rosterTable, personnelTable, dutyPointsTable } from "@workspace/db";
import {
  AssignDutyBody,
  GetRosterEntryParams,
  GetRosterEntryResponse,
  UpdateRosterEntryParams,
  UpdateRosterEntryBody,
  UpdateRosterEntryResponse,
  ReleaseFromDutyParams,
  ReleaseFromDutyResponse,
  ListRosterResponse,
  GetLiveBoardResponse,
  GetRosterStatsResponse,
  GetRosterRotationResponse,
  GetRosterTrendsResponse,
  GetRosterTrendsQueryParams,
} from "@workspace/api-zod";
import { notifyDutyAssigned, notifyDutyReleased } from "../lib/sms";

const router: IRouter = Router();

// Build a full roster entry with joined personnel and duty point
async function buildRosterEntry(id: number) {
  const [entry] = await db
    .select()
    .from(rosterTable)
    .where(eq(rosterTable.id, id));
  if (!entry) return null;

  const [person] = await db
    .select()
    .from(personnelTable)
    .where(eq(personnelTable.id, entry.personnelId));

  const [point] = await db
    .select()
    .from(dutyPointsTable)
    .where(eq(dutyPointsTable.id, entry.dutyPointId));

  return {
    ...entry,
    startDateTime: entry.startDateTime.toISOString(),
    endDateTime: entry.endDateTime ? entry.endDateTime.toISOString() : null,
    createdAt: entry.createdAt.toISOString(),
    personnel: person
      ? { ...person, createdAt: person.createdAt.toISOString() }
      : undefined,
    dutyPoint: point
      ? { ...point, createdAt: point.createdAt.toISOString() }
      : undefined,
  };
}

// Auto-expire fixed duties that have passed their end time
async function autoExpireFixedDuties() {
  const now = new Date();
  await db
    .update(rosterTable)
    .set({ status: "expired" })
    .where(
      and(
        eq(rosterTable.status, "active"),
        eq(rosterTable.dutyType, "fixed"),
        not(isNull(rosterTable.endDateTime)),
        lt(rosterTable.endDateTime, now),
      ),
    );
}

router.get("/roster", async (req, res): Promise<void> => {
  await autoExpireFixedDuties();

  const entries = await db
    .select()
    .from(rosterTable)
    .orderBy(rosterTable.createdAt);

  const enriched = await Promise.all(
    entries.map(async (entry) => {
      const [person] = await db
        .select()
        .from(personnelTable)
        .where(eq(personnelTable.id, entry.personnelId));
      const [point] = await db
        .select()
        .from(dutyPointsTable)
        .where(eq(dutyPointsTable.id, entry.dutyPointId));
      return {
        ...entry,
        startDateTime: entry.startDateTime.toISOString(),
        endDateTime: entry.endDateTime ? entry.endDateTime.toISOString() : null,
        createdAt: entry.createdAt.toISOString(),
        personnel: person
          ? { ...person, createdAt: person.createdAt.toISOString() }
          : undefined,
        dutyPoint: point
          ? { ...point, createdAt: point.createdAt.toISOString() }
          : undefined,
      };
    }),
  );

  res.json(ListRosterResponse.parse(enriched));
});

router.post("/roster", async (req, res): Promise<void> => {
  const parsed = AssignDutyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { dutyType, endDateTime } = parsed.data;

  if (dutyType === "fixed" && !endDateTime) {
    res.status(400).json({ error: "Fixed duty requires an end date/time" });
    return;
  }

  // Check if personnel already has an active duty
  const [existingDuty] = await db
    .select()
    .from(rosterTable)
    .where(
      and(
        eq(rosterTable.personnelId, parsed.data.personnelId),
        eq(rosterTable.status, "active"),
      ),
    );

  if (existingDuty) {
    res.status(400).json({ error: "Personnel is already on active duty" });
    return;
  }

  const insertData: typeof rosterTable.$inferInsert = {
    personnelId: parsed.data.personnelId,
    dutyPointId: parsed.data.dutyPointId,
    dutyType: parsed.data.dutyType,
    startDateTime: new Date(parsed.data.startDateTime),
    endDateTime:
      parsed.data.endDateTime ? new Date(parsed.data.endDateTime) : null,
    notes: parsed.data.notes ?? null,
    status: "active",
  };

  const [entry] = await db.insert(rosterTable).values(insertData).returning();
  const full = await buildRosterEntry(entry.id);
  res.status(201).json(GetRosterEntryResponse.parse(full));

  // Fire SMS non-blocking — response already sent
  if (full?.personnel && full?.dutyPoint) {
    notifyDutyAssigned({
      name: full.personnel.name,
      rank: full.personnel.rank,
      beltNumber: full.personnel.beltNumber,
      mobile: full.personnel.mobileNumber,
      dutyPointName: full.dutyPoint.name,
      dutyPointLocation: full.dutyPoint.location,
      dutyType: full.dutyType as "unlimited" | "fixed",
      startDateTime: new Date(full.startDateTime),
      endDateTime: full.endDateTime ? new Date(full.endDateTime) : null,
    }).catch((err) => req.log.error({ err }, "SMS assign notification failed"));
  }
});

router.get("/roster/live", async (req, res): Promise<void> => {
  await autoExpireFixedDuties();

  const allPersonnel = await db.select().from(personnelTable);
  const allPoints = await db.select().from(dutyPointsTable);

  const activeRoster = await db
    .select()
    .from(rosterTable)
    .where(eq(rosterTable.status, "active"));

  const onDutyPersonnelIds = new Set(activeRoster.map((r) => r.personnelId));

  const onDutyEnriched = await Promise.all(
    activeRoster.map(async (entry) => {
      const person = allPersonnel.find((p) => p.id === entry.personnelId);
      const point = allPoints.find((p) => p.id === entry.dutyPointId);
      return {
        ...entry,
        startDateTime: entry.startDateTime.toISOString(),
        endDateTime: entry.endDateTime ? entry.endDateTime.toISOString() : null,
        createdAt: entry.createdAt.toISOString(),
        personnel: person
          ? { ...person, createdAt: person.createdAt.toISOString() }
          : undefined,
        dutyPoint: point
          ? { ...point, createdAt: point.createdAt.toISOString() }
          : undefined,
      };
    }),
  );

  const available = allPersonnel
    .filter((p) => !onDutyPersonnelIds.has(p.id))
    .map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }));

  res.json(
    GetLiveBoardResponse.parse({
      onDuty: onDutyEnriched,
      available,
      totalPersonnel: allPersonnel.length,
      totalDutyPoints: allPoints.length,
    }),
  );
});

router.get("/roster/stats", async (req, res): Promise<void> => {
  await autoExpireFixedDuties();

  const allPersonnel = await db.select().from(personnelTable);

  const activeRoster = await db
    .select()
    .from(rosterTable)
    .where(eq(rosterTable.status, "active"));

  const onDutyIds = new Set(activeRoster.map((r) => r.personnelId));

  const totalOnDuty = onDutyIds.size;
  const totalPersonnel = allPersonnel.length;
  const totalAvailable = totalPersonnel - totalOnDuty;

  const unlimitedDuty = activeRoster.filter(
    (r) => r.dutyType === "unlimited",
  ).length;
  const fixedDuty = activeRoster.filter((r) => r.dutyType === "fixed").length;

  const ranks = ["Constable", "Head Constable", "Sub-Inspector", "Inspector"] as const;

  const byRank = ranks.map((rank) => {
    const rankPersonnel = allPersonnel.filter((p) => p.rank === rank);
    const rankOnDuty = rankPersonnel.filter((p) => onDutyIds.has(p.id)).length;
    return {
      rank,
      onDuty: rankOnDuty,
      available: rankPersonnel.length - rankOnDuty,
      total: rankPersonnel.length,
    };
  });

  res.json(
    GetRosterStatsResponse.parse({
      totalOnDuty,
      totalAvailable,
      totalPersonnel,
      unlimitedDuty,
      fixedDuty,
      byRank,
    }),
  );
});

router.get("/roster/rotation", async (req, res): Promise<void> => {
  const allPersonnel = await db.select().from(personnelTable);

  const dutySummary = await db
    .select({
      personnelId: rosterTable.personnelId,
      lastDutyDate: sql<string>`MAX(${rosterTable.startDateTime})`.as("lastDutyDate"),
      totalDuties: drizzleCount(rosterTable.id).as("totalDuties"),
    })
    .from(rosterTable)
    .groupBy(rosterTable.personnelId);

  const dutyMap = new Map(dutySummary.map((d) => [d.personnelId, d]));
  const now = new Date();

  const result = allPersonnel
    .map((p) => {
      const duty = dutyMap.get(p.id);
      const lastDutyDate = duty?.lastDutyDate ?? null;
      const daysSinceLastDuty = lastDutyDate
        ? Math.floor((now.getTime() - new Date(lastDutyDate).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      return {
        personnel: { ...p, createdAt: p.createdAt.toISOString() },
        lastDutyDate: lastDutyDate ? new Date(lastDutyDate).toISOString() : null,
        daysSinceLastDuty,
        totalDuties: Number(duty?.totalDuties ?? 0),
      };
    })
    .sort((a, b) => {
      if (a.lastDutyDate === null && b.lastDutyDate === null) return 0;
      if (a.lastDutyDate === null) return -1;
      if (b.lastDutyDate === null) return 1;
      return (b.daysSinceLastDuty ?? 0) - (a.daysSinceLastDuty ?? 0);
    });

  res.json(GetRosterRotationResponse.parse(result));
});

router.get("/roster/trends", async (req, res): Promise<void> => {
  const query = GetRosterTrendsQueryParams.safeParse(req.query);
  const days = query.success && query.data.days ? query.data.days : 7;

  const trends: { date: string; onDutyCount: number; totalAssignments: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);

    const [row] = await db
      .select({ count: drizzleCount(rosterTable.id) })
      .from(rosterTable)
      .where(
        and(
          sql`${rosterTable.startDateTime} <= ${dayEnd}`,
          sql`(${rosterTable.endDateTime} IS NULL OR ${rosterTable.endDateTime} >= ${d})`,
        ),
      );

    const [assigned] = await db
      .select({ count: drizzleCount(rosterTable.id) })
      .from(rosterTable)
      .where(sql`DATE(${rosterTable.startDateTime}) = ${d.toISOString().split("T")[0]}`);

    trends.push({
      date: d.toISOString().split("T")[0],
      onDutyCount: Number(row?.count ?? 0),
      totalAssignments: Number(assigned?.count ?? 0),
    });
  }

  res.json(GetRosterTrendsResponse.parse(trends));
});

router.get("/roster/:id", async (req, res): Promise<void> => {
  const params = GetRosterEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const full = await buildRosterEntry(params.data.id);
  if (!full) {
    res.status(404).json({ error: "Roster entry not found" });
    return;
  }

  res.json(GetRosterEntryResponse.parse(full));
});

router.patch("/roster/:id", async (req, res): Promise<void> => {
  const params = UpdateRosterEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateRosterEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Partial<typeof rosterTable.$inferInsert> = {};
  if (parsed.data.dutyPointId !== undefined)
    updateData.dutyPointId = parsed.data.dutyPointId;
  if (parsed.data.dutyType !== undefined)
    updateData.dutyType = parsed.data.dutyType;
  if (parsed.data.startDateTime !== undefined)
    updateData.startDateTime = new Date(parsed.data.startDateTime);
  if (parsed.data.endDateTime !== undefined)
    updateData.endDateTime = new Date(parsed.data.endDateTime);
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;

  const [entry] = await db
    .update(rosterTable)
    .set(updateData)
    .where(eq(rosterTable.id, params.data.id))
    .returning();

  if (!entry) {
    res.status(404).json({ error: "Roster entry not found" });
    return;
  }

  const full = await buildRosterEntry(entry.id);
  res.json(UpdateRosterEntryResponse.parse(full));
});

router.post("/roster/:id/release", async (req, res): Promise<void> => {
  const params = ReleaseFromDutyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(rosterTable)
    .where(eq(rosterTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Roster entry not found" });
    return;
  }

  if (existing.status !== "active") {
    res.status(400).json({ error: "Duty is already released or expired" });
    return;
  }

  const [entry] = await db
    .update(rosterTable)
    .set({ status: "released" })
    .where(eq(rosterTable.id, params.data.id))
    .returning();

  const full = await buildRosterEntry(entry.id);
  res.json(ReleaseFromDutyResponse.parse(full));

  // Fire SMS non-blocking — response already sent
  if (full?.personnel && full?.dutyPoint) {
    notifyDutyReleased({
      name: full.personnel.name,
      rank: full.personnel.rank,
      beltNumber: full.personnel.beltNumber,
      mobile: full.personnel.mobileNumber,
      dutyPointName: full.dutyPoint.name,
      releasedAt: new Date(),
    }).catch((err) => req.log.error({ err }, "SMS release notification failed"));
  }
});

export default router;
