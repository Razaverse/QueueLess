import type { Request, Response } from "express";

import prisma from "../db.js";

const adminClinicSelect = {
  id: true, name: true, email: true, phone: true, address: true, city: true, description: true, status: true, createdAt: true,
  staff: { select: { user: { select: { id: true, name: true, email: true } } } },
} as const;

export async function listPendingClinics(_req: Request, res: Response) {
  try {
    const clinics = await prisma.clinic.findMany({ where: { status: "PENDING" }, select: adminClinicSelect, orderBy: { createdAt: "asc" } });
    return res.status(200).json({ success: true, clinics });
  } catch (error) {
    console.error("Pending clinics error:", error);
    return res.status(500).json({ success: false, message: "Unable to retrieve pending clinics" });
  }
}

export async function listClinics(_req: Request, res: Response) {
  try {
    const clinics = await prisma.clinic.findMany({ select: adminClinicSelect, orderBy: { createdAt: "desc" } });
    return res.status(200).json({ success: true, clinics });
  } catch (error) {
    console.error("Clinics list error:", error);
    return res.status(500).json({ success: false, message: "Unable to retrieve clinics" });
  }
}

function updateStatus(status: "APPROVED" | "REJECTED" | "SUSPENDED") {
  return async (req: Request, res: Response) => {
    try {
      const clinicId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const current = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { id: true, status: true } });
      if (!current) return res.status(404).json({ success: false, message: "Clinic not found" });
      if (status === "SUSPENDED" && current.status !== "APPROVED") return res.status(400).json({ success: false, message: "Only approved clinics can be suspended" });
      const clinic = await prisma.clinic.update({ where: { id: current.id }, data: { status }, select: adminClinicSelect });
      return res.status(200).json({ success: true, clinic });
    } catch (error) {
      console.error("Clinic status update error:", error);
      return res.status(500).json({ success: false, message: "Unable to update clinic status" });
    }
  };
}

export const approveClinic = updateStatus("APPROVED");
export const rejectClinic = updateStatus("REJECTED");
export const suspendClinic = updateStatus("SUSPENDED");
