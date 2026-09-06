import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import type { Prisma } from "../../generated/prisma/client.js";

import prisma from "../db.js";

const clinicSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  city: true,
  state: true,
  postalCode: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ClinicSelect;

const clinicDashboardSelect = {
  ...clinicSelect,
  doctors: {
    select: {
      id: true,
      name: true,
      specialization: true,
      consultationDurationMinutes: true,
      isActive: true,
      schedules: { select: { id: true, dayOfWeek: true, startTime: true, endTime: true, isActive: true }, orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
    },
    orderBy: { name: "asc" },
  },
} satisfies Prisma.ClinicSelect;

function cleanRequired(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanOptional(value: unknown) {
  const cleaned = cleanRequired(value);
  return cleaned || null;
}

function routeParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function clinicInput(body: Record<string, unknown>) {
  return {
    name: cleanRequired(body.name),
    address: cleanRequired(body.address),
    city: cleanRequired(body.city),
    phone: cleanRequired(body.phone),
    email: cleanRequired(body.email).toLowerCase(),
    description: cleanOptional(body.description),
  };
}

function isValidEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email);
}

export async function registerClinic(req: Request, res: Response) {
  try {
    const clinic = clinicInput(req.body);
    const adminName = cleanRequired(req.body.adminName);
    const adminEmail = cleanRequired(req.body.adminEmail).toLowerCase();
    const adminPassword = typeof req.body.adminPassword === "string" ? req.body.adminPassword : "";

    if (!clinic.name || !clinic.address || !clinic.city || !clinic.phone || !clinic.email || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({ success: false, message: "Clinic and administrator details are required" });
    }
    if (!isValidEmail(clinic.email) || !isValidEmail(adminEmail)) {
      return res.status(400).json({ success: false, message: "Please provide valid email addresses" });
    }
    if (adminPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Administrator password must be at least 6 characters" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "Administrator email is already registered" });
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: adminName, email: adminEmail, passwordHash, phone: clinic.phone, role: "CLINIC_ADMIN" },
      });
      const createdClinic = await tx.clinic.create({ data: clinic, select: clinicSelect });
      await tx.clinicStaff.create({ data: { userId: user.id, clinicId: createdClinic.id } });
      return { user, clinic: createdClinic };
    });

    return res.status(201).json({
      success: true,
      message: "Clinic submitted for approval",
      clinic: result.clinic,
      admin: { id: result.user.id, name: result.user.name, email: result.user.email, role: result.user.role },
    });
  } catch (error) {
    console.error("Clinic registration error:", error);
    return res.status(500).json({ success: false, message: "Unable to register clinic" });
  }
}

export async function listApprovedClinics(req: Request, res: Response) {
  try {
    const search = cleanRequired(req.query.search);
    const clinics = await prisma.clinic.findMany({
      where: {
        status: "APPROVED",
        ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { city: { contains: search, mode: "insensitive" } }] } : {}),
      },
      select: { ...clinicSelect, _count: { select: { doctors: { where: { isActive: true } } } } },
      orderBy: { name: "asc" },
    });
    return res.status(200).json({ success: true, clinics: clinics.map(({ _count, ...clinic }) => ({ ...clinic, doctorCount: _count.doctors })) });
  } catch (error) {
    console.error("Clinic listing error:", error);
    return res.status(500).json({ success: false, message: "Unable to retrieve clinics" });
  }
}

export async function getClinicDetails(req: Request, res: Response) {
  try {
    const clinicId = routeParam(req.params.id);
    const clinic = await prisma.clinic.findFirst({
      where: { id: clinicId, status: "APPROVED" },
      select: { ...clinicSelect, doctors: { where: { isActive: true }, select: { id: true, name: true, specialization: true }, orderBy: { name: "asc" } } },
    });
    if (!clinic) return res.status(404).json({ success: false, message: "Clinic not found" });
    return res.status(200).json({ success: true, clinic });
  } catch (error) {
    console.error("Clinic details error:", error);
    return res.status(500).json({ success: false, message: "Unable to retrieve clinic" });
  }
}

export async function getMyClinic(req: Request, res: Response) {
  try {
    const staff = await prisma.clinicStaff.findUnique({
      where: { userId: req.user!.userId },
      select: { clinic: { select: clinicDashboardSelect } },
    });
    if (!staff) return res.status(404).json({ success: false, message: "No clinic is associated with this account" });
    return res.status(200).json({ success: true, clinic: staff.clinic });
  } catch (error) {
    console.error("My clinic error:", error);
    return res.status(500).json({ success: false, message: "Unable to retrieve clinic" });
  }
}

export async function updateMyClinic(req: Request, res: Response) {
  try {
    const clinicId = routeParam(req.params.id);
    const staff = await prisma.clinicStaff.findFirst({ where: { userId: req.user!.userId, clinicId } });
    if (!staff) return res.status(403).json({ success: false, message: "You can only manage your own clinic" });

    const clinic = clinicInput(req.body);
    if (!clinic.name || !clinic.address || !clinic.city || !clinic.phone || !clinic.email || !isValidEmail(clinic.email)) {
      return res.status(400).json({ success: false, message: "Name, address, city, phone and a valid email are required" });
    }

    const updatedClinic = await prisma.clinic.update({ where: { id: clinicId }, data: clinic, select: clinicSelect });
    return res.status(200).json({ success: true, clinic: updatedClinic });
  } catch (error) {
    console.error("Clinic update error:", error);
    return res.status(500).json({ success: false, message: "Unable to update clinic" });
  }
}
