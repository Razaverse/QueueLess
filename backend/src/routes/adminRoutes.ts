import { Router } from "express";

import { approveClinic, listPendingClinics, rejectClinic, suspendClinic } from "../controllers/adminController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();
router.use(requireAuth, requireRole("PLATFORM_ADMIN"));
router.get("/clinics/pending", listPendingClinics);
router.patch("/clinics/:id/approve", approveClinic);
router.patch("/clinics/:id/reject", rejectClinic);
router.patch("/clinics/:id/suspend", suspendClinic);

export default router;
