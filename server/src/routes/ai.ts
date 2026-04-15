import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { analyzeLeadAI, matchPropertiesAI, aiDashboard } from "../controllers/ai.controller";

const router = Router();

router.use(requireAuth);

router.get("/dashboard", aiDashboard);
router.get("/leads/:leadId/analyze", analyzeLeadAI);
router.get("/leads/:leadId/match-properties", matchPropertiesAI);

export default router;
