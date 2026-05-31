import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard/index.js";
import authRouter from "./auth.js";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use("/dashboard", requireAuth, dashboardRouter);

export default router;
