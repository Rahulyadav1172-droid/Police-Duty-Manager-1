import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, eventsTable } from "@workspace/db";
import {
  CreateEventBody,
  ListEventsResponse,
  UpdateEventParams,
  UpdateEventBody,
  UpdateEventResponse,
  DeleteEventParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/events", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(eventsTable)
    .orderBy(eventsTable.date);

  res.json(
    ListEventsResponse.parse(
      rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    ),
  );
});

router.post("/events", async (req, res): Promise<void> => {
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const dateStr = parsed.data.date instanceof Date
    ? parsed.data.date.toISOString().split("T")[0]
    : String(parsed.data.date);

  const [row] = await db
    .insert(eventsTable)
    .values({
      name: parsed.data.name,
      date: dateStr,
      location: parsed.data.location ?? null,
      description: parsed.data.description ?? null,
      requiredHeadcount: parsed.data.requiredHeadcount,
    })
    .returning();

  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.patch("/events/:id", async (req, res): Promise<void> => {
  const params = UpdateEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Partial<typeof eventsTable.$inferInsert> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.date !== undefined) {
    updateData.date = parsed.data.date instanceof Date
      ? parsed.data.date.toISOString().split("T")[0]
      : String(parsed.data.date);
  }
  if (parsed.data.location !== undefined) updateData.location = parsed.data.location;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.requiredHeadcount !== undefined)
    updateData.requiredHeadcount = parsed.data.requiredHeadcount;

  const [row] = await db
    .update(eventsTable)
    .set(updateData)
    .where(eq(eventsTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json(UpdateEventResponse.parse({ ...row, createdAt: row.createdAt.toISOString() }));
});

router.delete("/events/:id", async (req, res): Promise<void> => {
  const params = DeleteEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .delete(eventsTable)
    .where(eq(eventsTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.status(204).end();
});

export default router;
