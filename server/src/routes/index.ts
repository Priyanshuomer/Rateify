import { Router } from "express";
import adminRoutes from "./admin.routes";
import authRoutes from "./auth.routes";
import ownerRoutes from "./owner.routes";
import profileRoutes from "./profile.routes";
import ratingRoutes from "./rating.routes";
import storeRoutes from "./store.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/stores", storeRoutes);
router.use("/ratings", ratingRoutes);
router.use("/owner", ownerRoutes);
router.use("/admin", adminRoutes);

export default router;