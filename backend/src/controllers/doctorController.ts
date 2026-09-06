import type { Request, Response } from "express";

import prisma from "../db.js";
import type { Prisma } from "../../generated/prisma/client.js";

const doctorSelect = {
  id: true, clinicId: true, name: true, specialization: true, consultationDurationMinutes: true, isActive: true, createdAt: true, updatedAt: true,
  schedules: { select: { id: true, dayOfWeek: true, startTime: true, endTime: true, isActive: true }, orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
} satisfies Prisma.DoctorSelect;

function routeParam(value: string | string[]) { return Array.isArray(value) ? value[0] : value; }
function cleanRequired(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function booleanValue(value: unknown) { return typeof value === "boolean" ? value : null; }
function validTime(value: string) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }
function positiveDuration(value: unknown) {
  const duration = typeof value === "number" ? value : Number(value);
  return Number.isInteger(duration) && duration > 0 && duration <= 480 ? duration : null;
}
async function ownsClinic(userId: string, clinicId: string) { return prisma.clinicStaff.findFirst({ where: { userId, clinicId }, select: { id: true } }); }
async function ownedDoctor(userId: string, clinicId: string, doctorId: string) {
  if (!await ownsClinic(userId, clinicId)) return null;
  return prisma.doctor.findFirst({ where: { id: doctorId, clinicId }, select: { id: true } });
}
function doctorInput(body: Record<string, unknown>) {
  return { name: cleanRequired(body.name), specialization: cleanRequired(body.specialization), consultationDurationMinutes: positiveDuration(body.consultationDurationMinutes) };
}
function scheduleInput(body: Record<string, unknown>) {
  const dayOfWeek = Number(body.dayOfWeek);
  const startTime = cleanRequired(body.startTime);
  const endTime = cleanRequired(body.endTime);
  const isActive = booleanValue(body.isActive);
  return { dayOfWeek, startTime, endTime, isActive, valid: Number.isInteger(dayOfWeek) && dayOfWeek >= 0 && dayOfWeek <= 6 && validTime(startTime) && validTime(endTime) && startTime < endTime && isActive !== null };
}

export async function listDoctors(req: Request, res: Response) {
  try {
    const clinicId = routeParam(req.params.clinicId);
    if (!await ownsClinic(req.user!.userId, clinicId)) return res.status(403).json({ success: false, message: "You can only manage doctors in your own clinic" });
    const doctors = await prisma.doctor.findMany({ where: { clinicId }, select: doctorSelect, orderBy: { name: "asc" } });
    return res.status(200).json({ success: true, doctors });
  } catch (error) { console.error("Doctor listing error:", error); return res.status(500).json({ success: false, message: "Unable to retrieve doctors" }); }
}

export async function createDoctor(req: Request, res: Response) {
  try {
    const clinicId = routeParam(req.params.clinicId);
    if (!await ownsClinic(req.user!.userId, clinicId)) return res.status(403).json({ success: false, message: "You can only manage doctors in your own clinic" });
    const doctor = doctorInput(req.body);
    if (!doctor.name || !doctor.specialization || !doctor.consultationDurationMinutes) return res.status(400).json({ success: false, message: "Doctor name, specialization and a consultation duration from 1 to 480 minutes are required" });
    const createdDoctor = await prisma.doctor.create({ data: { clinicId, name: doctor.name, specialization: doctor.specialization, consultationDurationMinutes: doctor.consultationDurationMinutes }, select: doctorSelect });
    return res.status(201).json({ success: true, doctor: createdDoctor });
  } catch (error) { console.error("Doctor creation error:", error); return res.status(500).json({ success: false, message: "Unable to add doctor" }); }
}

export async function updateDoctor(req: Request, res: Response) {
  try {
    const clinicId = routeParam(req.params.clinicId); const doctorId = routeParam(req.params.doctorId);
    if (!await ownedDoctor(req.user!.userId, clinicId, doctorId)) return res.status(403).json({ success: false, message: "You can only manage doctors in your own clinic" });
    const doctor = doctorInput(req.body); const isActive = booleanValue(req.body.isActive);
    if (!doctor.name || !doctor.specialization || !doctor.consultationDurationMinutes || isActive === null) return res.status(400).json({ success: false, message: "Doctor name, specialization, active status and a consultation duration from 1 to 480 minutes are required" });
    const updatedDoctor = await prisma.doctor.update({ where: { id: doctorId }, data: { name: doctor.name, specialization: doctor.specialization, consultationDurationMinutes: doctor.consultationDurationMinutes, isActive }, select: doctorSelect });
    return res.status(200).json({ success: true, doctor: updatedDoctor });
  } catch (error) { console.error("Doctor update error:", error); return res.status(500).json({ success: false, message: "Unable to update doctor" }); }
}

export async function deactivateDoctor(req: Request, res: Response) {
  try {
    const clinicId = routeParam(req.params.clinicId); const doctorId = routeParam(req.params.doctorId);
    if (!await ownedDoctor(req.user!.userId, clinicId, doctorId)) return res.status(403).json({ success: false, message: "You can only manage doctors in your own clinic" });
    const doctor = await prisma.doctor.update({ where: { id: doctorId }, data: { isActive: false }, select: doctorSelect });
    return res.status(200).json({ success: true, doctor });
  } catch (error) { console.error("Doctor deactivation error:", error); return res.status(500).json({ success: false, message: "Unable to deactivate doctor" }); }
}

export async function createSchedule(req: Request, res: Response) {
  try {
    const clinicId = routeParam(req.params.clinicId); const doctorId = routeParam(req.params.doctorId);
    if (!await ownedDoctor(req.user!.userId, clinicId, doctorId)) return res.status(403).json({ success: false, message: "You can only manage doctors in your own clinic" });
    const schedule = scheduleInput(req.body);
    if (!schedule.valid) return res.status(400).json({ success: false, message: "Provide a day from 0 to 6, valid start and end times, and an active status" });
    const createdSchedule = await prisma.doctorSchedule.create({ data: { doctorId, dayOfWeek: schedule.dayOfWeek, startTime: schedule.startTime, endTime: schedule.endTime, isActive: schedule.isActive! } });
    return res.status(201).json({ success: true, schedule: createdSchedule });
  } catch (error) { console.error("Schedule creation error:", error); return res.status(500).json({ success: false, message: "Unable to add schedule" }); }
}

export async function updateSchedule(req: Request, res: Response) {
  try {
    const clinicId = routeParam(req.params.clinicId); const doctorId = routeParam(req.params.doctorId); const scheduleId = routeParam(req.params.scheduleId);
    if (!await ownedDoctor(req.user!.userId, clinicId, doctorId)) return res.status(403).json({ success: false, message: "You can only manage doctors in your own clinic" });
    const schedule = scheduleInput(req.body);
    if (!schedule.valid) return res.status(400).json({ success: false, message: "Provide a day from 0 to 6, valid start and end times, and an active status" });
    const result = await prisma.doctorSchedule.updateMany({ where: { id: scheduleId, doctorId }, data: { dayOfWeek: schedule.dayOfWeek, startTime: schedule.startTime, endTime: schedule.endTime, isActive: schedule.isActive! } });
    if (result.count === 0) return res.status(404).json({ success: false, message: "Schedule not found" });
    const updatedSchedule = await prisma.doctorSchedule.findUnique({ where: { id: scheduleId } });
    return res.status(200).json({ success: true, schedule: updatedSchedule });
  } catch (error) { console.error("Schedule update error:", error); return res.status(500).json({ success: false, message: "Unable to update schedule" }); }
}
