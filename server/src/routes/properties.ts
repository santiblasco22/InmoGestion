import { Router } from "express";
import multer from "multer";
import * as propertiesController from "../controllers/properties.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

// multer stores files in memory (then streamed to R2)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.use(requireAuth);

router.get("/", propertiesController.list);
router.get("/:id", propertiesController.getOne);
router.post("/", upload.array("photos", 20), propertiesController.create);
router.put("/:id", propertiesController.update);
router.delete("/:id", propertiesController.remove);

// Photo management
router.post("/:id/photos", upload.array("photos", 20), propertiesController.addPhotos);
router.delete("/:id/photos/:photoKey", propertiesController.removePhoto);

export default router;
