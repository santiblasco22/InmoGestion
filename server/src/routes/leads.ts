import { Router } from "express";
import * as leadsController from "../controllers/leads.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", leadsController.list);
router.get("/:id", leadsController.getOne);
router.post("/", leadsController.create);
router.put("/:id", leadsController.update);
router.patch("/:id/stage", leadsController.updateStage);
router.delete("/:id", leadsController.remove);

// Notes
router.post("/:id/notes", leadsController.addNote);
router.get("/:id/notes", leadsController.getNotes);

export default router;
