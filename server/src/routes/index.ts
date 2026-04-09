import { Router } from "express";
import authRoutes from "./auth";
import propertiesRoutes from "./properties";
import leadsRoutes from "./leads";
import visitsRoutes from "./visits";
import analyticsRoutes from "./analytics";
import portalsRoutes from "./portals";
import adminRoutes from "./admin";

const router = Router();

router.use("/auth", authRoutes);
router.use("/properties", propertiesRoutes);
router.use("/leads", leadsRoutes);
router.use("/visits", visitsRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/portals", portalsRoutes);
router.use("/admin", adminRoutes);

export default router;
