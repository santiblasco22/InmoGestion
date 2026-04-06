import { Router } from "express";
import * as visitsController from "../controllers/visits.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", visitsController.list);
router.get("/:id", visitsController.getOne);
router.post("/", visitsController.create);
router.put("/:id", visitsController.update);
router.patch("/:id/status", visitsController.updateStatus);
router.delete("/:id", visitsController.remove);

export default router;
