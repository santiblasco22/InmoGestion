import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getAutomation, updateAutomation } from "../controllers/settings.controller";

const router = Router();
router.use(requireAuth);

router.get("/automation", getAutomation);
router.patch("/automation", updateAutomation);

export default router;
