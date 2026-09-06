import { Router } from "express";
import { getMyNotifications, markAllNotificationsRead, markNotificationRead } from "../controllers/notificationController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
const router = Router();
router.get("/mine", requireAuth, getMyNotifications);
router.patch("/mine/read-all", requireAuth, markAllNotificationsRead);
router.patch("/mine/:notificationId/read", requireAuth, markNotificationRead);
export default router;
