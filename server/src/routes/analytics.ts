import { Router } from "express";
import * as analyticsController from "../controllers/analytics.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/summary", analyticsController.summary);
router.get("/leads-over-time", analyticsController.leadsOverTime);
router.get("/visits-per-property", analyticsController.visitsPerProperty);
router.get("/pipeline-funnel", analyticsController.pipelineFunnel);
router.get("/activity", analyticsController.activityFeed);

export default router;
