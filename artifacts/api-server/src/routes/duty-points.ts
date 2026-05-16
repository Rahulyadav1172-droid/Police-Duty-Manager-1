import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, dutyPointsTable } from "@workspace/db";
import {
  ListDutyPointsResponse,
  CreateDutyPointBody,
  UpdateDutyPointParams,
  UpdateDutyPointBody,
  UpdateDutyPointResponse,
  DeleteDutyPointParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/duty-points", async (req, res): Promise<void> => {
  const points = await db
    .select()
    .from(dutyPointsTable)
    .orderBy(dutyPointsTable.createdAt);
  res.json(ListDutyPointsResponse.parse(points));
});

router.post("/duty-points", async (req, res): Promise<void> => {
  const parsed = CreateDutyPointBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [point] = await db
    .insert(dutyPointsTable)
    .values(parsed.data)
    .returning();

  res.status(201).json(point);
});

router.patch("/duty-points/:id", async (req, res): Promise<void> => {
  const params = UpdateDutyPointParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateDutyPointBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [point] = await db
    .update(dutyPointsTable)
    .set(parsed.data)
    .where(eq(dutyPointsTable.id, params.data.id))
    .returning();

  if (!point) {
    res.status(404).json({ error: "Duty point not found" });
    return;
  }

  res.json(UpdateDutyPointResponse.parse(point));
});

router.delete("/duty-points/:id", async (req, res): Promise<void> => {
  const params = DeleteDutyPointParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [point] = await db
    .delete(dutyPointsTable)
    .where(eq(dutyPointsTable.id, params.data.id))
    .returning();

  if (!point) {
    res.status(404).json({ error: "Duty point not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
