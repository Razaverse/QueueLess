import { Router } from "express";
import { cancelMyQueue, getClinicQueue, getMyQueue, joinQueue, listAvailableDoctors, updateQueueStatus } from "../controllers/queueController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();
router.get("/clinics/:clinicId/doctors", listAvailableDoctors);
router.post("/join", requireAuth, requireRole("PATIENT"), joinQueue);
router.get("/mine/today", requireAuth, requireRole("PATIENT"), getMyQueue);
router.patch("/mine/:entryId/cancel", requireAuth, requireRole("PATIENT"), cancelMyQueue);
router.get("/clinics/:clinicId", requireAuth, requireRole("CLINIC_ADMIN", "CLINIC_STAFF"), getClinicQueue);
router.patch("/clinics/:clinicId/entries/:entryId/:action", requireAuth, requireRole("CLINIC_ADMIN", "CLINIC_STAFF"), updateQueueStatus);
export default router;
