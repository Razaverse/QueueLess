import { Router } from "express";

import { createDoctor, createSchedule, deactivateDoctor, listDoctors, updateDoctor, updateSchedule } from "../controllers/doctorController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router({ mergeParams: true });
const manageDoctors = [requireAuth, requireRole("CLINIC_ADMIN", "CLINIC_STAFF")];

router.get("/", ...manageDoctors, listDoctors);
router.post("/", ...manageDoctors, createDoctor);
router.put("/:doctorId", ...manageDoctors, updateDoctor);
router.patch("/:doctorId/deactivate", ...manageDoctors, deactivateDoctor);
router.post("/:doctorId/schedules", ...manageDoctors, createSchedule);
router.put("/:doctorId/schedules/:scheduleId", ...manageDoctors, updateSchedule);

export default router;
