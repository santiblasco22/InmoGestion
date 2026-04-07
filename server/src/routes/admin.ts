import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth";
import * as adminController from "../controllers/admin.controller";

const router = Router();

// All admin routes require auth + admin role
router.use(requireAuth, requireAdmin);

router.get("/stats", adminController.getStats);
router.get("/agents", adminController.listAgents);
router.get("/leads", adminController.listAllLeads);
router.put("/leads/:id/reassign", adminController.reassignLead);

export default router;
