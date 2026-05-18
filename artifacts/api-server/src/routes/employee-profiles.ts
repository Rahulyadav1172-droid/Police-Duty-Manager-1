import { Router, type IRouter } from "express";
import { eq, ilike } from "drizzle-orm";
import { db, employeeProfilesTable } from "@workspace/db";
import {
  CreateEmployeeProfileBody,
  UpdateEmployeeProfileBody,
  UpdateEmployeeProfileParams,
  DeleteEmployeeProfileParams,
  ListEmployeeProfilesResponse,
  ListEmployeeProfilesResponseItem,
  GetEmployeeProfileResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serialize(row: typeof employeeProfilesTable.$inferSelect) {
  return {
    ...row,
    ehrmsCode: row.ehrmsCode ?? null,
    photoUrl: row.photoUrl ?? null,
    characterRollPhotoUrl: row.characterRollPhotoUrl ?? null,
    permanentAddress: row.permanentAddress ?? null,
    pinCode: row.pinCode ?? null,
    policeStation: row.policeStation ?? null,
    homeDistrict: row.homeDistrict ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

router.get("/employee-profiles", async (req, res): Promise<void> => {
  const { pno } = req.query as { pno?: string };
  let rows;
  if (pno) {
    rows = await db
      .select()
      .from(employeeProfilesTable)
      .where(ilike(employeeProfilesTable.pno, pno));
  } else {
    rows = await db.select().from(employeeProfilesTable);
  }
  res.json(ListEmployeeProfilesResponse.parse(rows.map(serialize)));
});

router.post("/employee-profiles", async (req, res): Promise<void> => {
  const parsed = CreateEmployeeProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  try {
    const [row] = await db
      .insert(employeeProfilesTable)
      .values({
        pno: d.pno,
        name: d.name,
        mobileNumber: d.mobileNumber,
        fatherName: d.fatherName,
        motherName: d.motherName,
        gender: d.gender,
        dob: d.dob,
        dateOfJoining: d.dateOfJoining,
        dateOfCurrentPosting: d.dateOfCurrentPosting,
        rank: d.rank,
        ehrmsCode: d.ehrmsCode ?? null,
        photoUrl: d.photoUrl ?? null,
        characterRollPhotoUrl: d.characterRollPhotoUrl ?? null,
        permanentAddress: d.permanentAddress ?? null,
        pinCode: d.pinCode ?? null,
        policeStation: d.policeStation ?? null,
        homeDistrict: d.homeDistrict ?? null,
      })
      .returning();
    res.status(201).json(ListEmployeeProfilesResponseItem.parse(serialize(row)));
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "PNO already exists" });
    } else {
      throw err;
    }
  }
});

router.get("/employee-profiles/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db
    .select()
    .from(employeeProfilesTable)
    .where(eq(employeeProfilesTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(GetEmployeeProfileResponse.parse(serialize(row)));
});

router.put("/employee-profiles/:id", async (req, res): Promise<void> => {
  const params = UpdateEmployeeProfileParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateEmployeeProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const [row] = await db
    .update(employeeProfilesTable)
    .set({
      pno: d.pno,
      name: d.name,
      mobileNumber: d.mobileNumber,
      fatherName: d.fatherName,
      motherName: d.motherName,
      gender: d.gender,
      dob: d.dob,
      dateOfJoining: d.dateOfJoining,
      dateOfCurrentPosting: d.dateOfCurrentPosting,
      rank: d.rank,
      ehrmsCode: d.ehrmsCode ?? null,
      photoUrl: d.photoUrl ?? null,
      characterRollPhotoUrl: d.characterRollPhotoUrl ?? null,
      permanentAddress: d.permanentAddress ?? null,
      pinCode: d.pinCode ?? null,
      policeStation: d.policeStation ?? null,
      homeDistrict: d.homeDistrict ?? null,
      updatedAt: new Date(),
    })
    .where(eq(employeeProfilesTable.id, params.data.id))
    .returning();

  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(ListEmployeeProfilesResponseItem.parse(serialize(row)));
});

router.delete("/employee-profiles/:id", async (req, res): Promise<void> => {
  const params = DeleteEmployeeProfileParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .delete(employeeProfilesTable)
    .where(eq(employeeProfilesTable.id, params.data.id))
    .returning();

  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).end();
});

export default router;
