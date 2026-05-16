import { Router, type IRouter } from "express";
import healthRouter from "./health";
import personnelRouter from "./personnel";
import dutyPointsRouter from "./duty-points";
import rosterRouter from "./roster";

const router: IRouter = Router();

router.use(healthRouter);
router.use(personnelRouter);
router.use(dutyPointsRouter);
router.use(rosterRouter);

export default router;
