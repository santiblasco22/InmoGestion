import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Registration is disabled — accounts are created directly in the database
router.post("/register", (_req, res) => {
  res.status(403).json({ error: { message: "El registro está deshabilitado. Contactá al administrador.", code: "REGISTRATION_DISABLED" } });
});
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", requireAuth, authController.me);
router.put("/profile", requireAuth, authController.updateProfile);
router.put("/password", requireAuth, authController.changePassword);

export default router;
