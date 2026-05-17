import { Router, type IRouter } from "express";
import healthRouter from "./health";
import personnelRouter from "./personnel";
import dutyPointsRouter from "./duty-points";
import rosterRouter from "./roster";
import leaveRouter from "./leave";
import biometricRouter from "./biometric";

const router: IRouter = Router();

router.use(healthRouter);
router.use(personnelRouter);
router.use(dutyPointsRouter);
router.use(rosterRouter);
router.use(leaveRouter);
router.use(biometricRouter);

export default router;
