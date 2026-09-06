import { Router } from "express";

import {
  registerPatient,
  login,
} from "../controllers/authController.js";

const router = Router();

router.post("/register", registerPatient);
router.post("/login", login);

export default router;