import { Router } from "express";
import * as portalsController from "../controllers/portals.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.post("/sync/:propertyId", portalsController.triggerSync);
router.get("/sync/:propertyId", portalsController.getSyncStatus);

export default router;
