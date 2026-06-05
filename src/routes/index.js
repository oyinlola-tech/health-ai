import { Router } from "express";
import { configController } from "../controllers/configController.js";
import { authRoutes } from "./authRoutes.js";
import { meRoutes } from "./meRoutes.js";
import { reportRoutes } from "./reportRoutes.js";
import { aiRoutes } from "./aiRoutes.js";
import { appointmentRoutes } from "./appointmentRoutes.js";
import { notificationRoutes } from "./notificationRoutes.js";
import { recruitmentRoutes } from "./recruitmentRoutes.js";
import { adminRoutes } from "./adminRoutes.js";
import { doctorRoutes } from "./doctorRoutes.js";
import { legalRoutes } from "./legalRoutes.js";
import { healthHistoryRoutes } from "./healthHistoryRoutes.js";
import { subscriptionRoutes } from "./subscriptionRoutes.js";
import { doctorMarketplaceRoutes } from "./doctorMarketplaceRoutes.js";

export const apiRoutes = Router();

apiRoutes.get("/health", async (req, res, next) => {
  try {
    await configController.health(req, res);
  } catch (error) {
    next(error);
  }
});
apiRoutes.get("/config/public", configController.public);
apiRoutes.use("/auth", authRoutes);
apiRoutes.use("/me", meRoutes);
apiRoutes.use("/reports", reportRoutes);
apiRoutes.use("/ai", aiRoutes);
apiRoutes.use("/appointments", appointmentRoutes);
apiRoutes.use("/notifications", notificationRoutes);
apiRoutes.use("/recruitment", recruitmentRoutes);
apiRoutes.use("/admin", adminRoutes);
apiRoutes.use("/doctor", doctorRoutes);
apiRoutes.use("/legal", legalRoutes);
apiRoutes.use("/health-history", healthHistoryRoutes);
apiRoutes.use("/", subscriptionRoutes);
apiRoutes.use("/", doctorMarketplaceRoutes);
