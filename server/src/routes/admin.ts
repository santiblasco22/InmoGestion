import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/auth";
import * as adminController from "../controllers/admin.controller";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/agents", adminController.getAgents);
router.delete("/agents/:agentId", adminController.deleteAgent);

export default router;
