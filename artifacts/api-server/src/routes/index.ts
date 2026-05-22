import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard/index.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/dashboard", dashboardRouter);

export default router;
