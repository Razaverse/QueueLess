import { Router } from "express";

import { getClinicDetails, getMyClinic, listApprovedClinics, registerClinic, updateMyClinic } from "../controllers/clinicController.js";
import doctorRoutes from "./doctorRoutes.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();

router.post("/register", registerClinic);
router.get("/", listApprovedClinics);
router.get("/mine", requireAuth, requireRole("CLINIC_ADMIN", "CLINIC_STAFF"), getMyClinic);
router.put("/:id", requireAuth, requireRole("CLINIC_ADMIN"), updateMyClinic);
router.use("/:clinicId/doctors", doctorRoutes);
router.get("/:id", getClinicDetails);

export default router;
