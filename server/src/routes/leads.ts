import { Router } from "express";
import * as leadsController from "../controllers/leads.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", leadsController.list);
router.get("/:id", leadsController.getOne);
router.post("/", leadsController.create);
router.post("/import", leadsController.importLeads);
router.put("/:id", leadsController.update);
router.patch("/:id/stage", leadsController.updateStage);
router.delete("/:id", leadsController.remove);

// Interested properties
router.post("/:id/properties/:propertyId", leadsController.addProperty);
router.delete("/:id/properties/:propertyId", leadsController.removeProperty);

// Notes
router.post("/:id/notes", leadsController.addNote);
router.get("/:id/notes", leadsController.getNotes);
router.patch("/:id/notes/:noteId", leadsController.updateNote);
router.delete("/:id/notes/:noteId", leadsController.deleteNote);

export default router;
