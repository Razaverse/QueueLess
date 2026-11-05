import type { Request, Response } from "express";
import type { Prisma } from "../../generated/prisma/client.js";
import prisma from "../db.js";

const activeStatuses = ["WAITING", "CALLED", "IN_CONSULTATION"] as const;
type ActiveStatus = (typeof activeStatuses)[number];

function routeParam(value: string | string[]) { return Array.isArray(value) ? value[0] : value; }
function today() { const date = new Date(); date.setHours(0, 0, 0, 0); return date; }
function isActive(status: string) { return activeStatuses.includes(status as ActiveStatus); }
function entrySelect() {
  return { id: true, tokenNumber: true, queueDate: true, status: true, joinedAt: true, calledAt: true, consultationStartedAt: true, completedAt: true,
    patient: { select: { id: true, user: { select: { name: true } } } },
    doctor: { select: { id: true, name: true, specialization: true, consultationDurationMinutes: true } },
    clinic: { select: { id: true, name: true } },
  } satisfies Prisma.QueueEntrySelect;
}
function patientEntrySelect() {
  return { id: true, tokenNumber: true, queueDate: true, status: true, joinedAt: true, calledAt: true, consultationStartedAt: true, completedAt: true,
    patient: { select: { id: true, user: { select: { name: true } } } },
    doctor: { select: { id: true, name: true, specialization: true, consultationDurationMinutes: true } },
    clinic: { select: { id: true, name: true } },
  } satisfies Prisma.QueueEntrySelect;
}
function enrich(entries: Array<any>) {
  const active = entries.filter((entry) => isActive(entry.status)).sort((a, b) => a.tokenNumber - b.tokenNumber);
  return entries.map((entry) => {
    const index = active.findIndex((item) => item.id === entry.id);
    const position = index === -1 ? null : index + 1;
    return { ...entry, position, estimatedWaitingMinutes: position === null ? null : Math.max(0, position - 1) * entry.doctor.consultationDurationMinutes };
  });
}
async function ownsClinic(userId: string, clinicId: string) { return prisma.clinicStaff.findFirst({ where: { userId, clinicId }, select: { id: true } }); }

export async function listAvailableDoctors(req: Request, res: Response) {
  try {
    const clinicId = routeParam(req.params.clinicId);
    const clinic = await prisma.clinic.findFirst({ where: { id: clinicId, status: "APPROVED" }, select: { id: true, name: true, doctors: { where: { isActive: true }, select: { id: true, name: true, specialization: true, consultationDurationMinutes: true }, orderBy: { name: "asc" } } } });
    if (!clinic) return res.status(404).json({ success: false, message: "Approved clinic not found" });
    return res.status(200).json({ success: true, clinic });
  } catch (error) { console.error("Available doctor listing error:", error); return res.status(500).json({ success: false, message: "Unable to retrieve doctors" }); }
}

export async function joinQueue(req: Request, res: Response) {
  const clinicId = typeof req.body.clinicId === "string" ? req.body.clinicId : "";
  const doctorId = typeof req.body.doctorId === "string" ? req.body.doctorId : "";
  if (!clinicId || !doctorId) return res.status(400).json({ success: false, message: "Clinic and doctor are required" });
  const queueDate = today();
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${clinicId}:${doctorId}:${queueDate.toISOString()}`}))`;
      const patient = await tx.patient.findUnique({ where: { userId: req.user!.userId }, select: { id: true, userId: true } });
      if (!patient) throw new Error("PATIENT_NOT_FOUND");
      const doctor = await tx.doctor.findFirst({ where: { id: doctorId, clinicId, isActive: true, clinic: { status: "APPROVED" } }, select: { id: true } });
      if (!doctor) throw new Error("DOCTOR_NOT_AVAILABLE");
      const duplicate = await tx.queueEntry.findFirst({ where: { patientId: patient.id, doctorId, queueDate, status: { in: [...activeStatuses] } }, select: { id: true } });
      if (duplicate) throw new Error("DUPLICATE_QUEUE_ENTRY");
      const latest = await tx.queueEntry.aggregate({ where: { clinicId, doctorId, queueDate }, _max: { tokenNumber: true } });
      const entry = await tx.queueEntry.create({ data: { patientId: patient.id, clinicId, doctorId, queueDate, tokenNumber: (latest._max.tokenNumber ?? 0) + 1 }, select: entrySelect() });
      await tx.notification.create({ data: { userId: patient.userId, type: "QUEUE_JOINED", message: `You joined ${entry.clinic.name}'s queue for ${entry.doctor.name}. Your token is #${entry.tokenNumber}.` } });
      const position = await tx.queueEntry.count({ where: { clinicId, doctorId, queueDate, status: { in: [...activeStatuses] } } });
      return { ...entry, position, estimatedWaitingMinutes: Math.max(0, position - 1) * entry.doctor.consultationDurationMinutes };
    }, { isolationLevel: "Serializable" });
    return res.status(201).json({ success: true, entry: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "PATIENT_NOT_FOUND") return res.status(403).json({ success: false, message: "Patient account required" });
    if (message === "DOCTOR_NOT_AVAILABLE") return res.status(400).json({ success: false, message: "Doctor is not available for this approved clinic" });
    if (message === "DUPLICATE_QUEUE_ENTRY") return res.status(409).json({ success: false, message: "You already have an active queue entry with this doctor today" });
    console.error("Queue join error:", error); return res.status(500).json({ success: false, message: "Unable to join queue" });
  }
}

export async function getMyQueue(req: Request, res: Response) {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId }, select: { id: true } });
    if (!patient) return res.status(403).json({ success: false, message: "Patient account required" });
    const queueDate = today();
    const myEntries = await prisma.queueEntry.findMany({ where: { patientId: patient.id, queueDate }, select: patientEntrySelect(), orderBy: { tokenNumber: "asc" } });
    const positions = await Promise.all(myEntries.map(async (entry) => {
      if (!isActive(entry.status)) return null;
      return prisma.queueEntry.count({ where: { clinicId: entry.clinic.id, doctorId: entry.doctor.id, queueDate, status: { in: [...activeStatuses] }, tokenNumber: { lte: entry.tokenNumber } } });
    }));
    return res.status(200).json({ success: true, entries: myEntries.map((entry, index) => {
      const position = positions[index];
      return { ...entry, position, estimatedWaitingMinutes: position === null ? null : Math.max(0, position - 1) * entry.doctor.consultationDurationMinutes };
    }) });
  } catch (error) { console.error("Patient queue error:", error); return res.status(500).json({ success: false, message: "Unable to retrieve your queue" }); }
}

export async function getClinicQueue(req: Request, res: Response) {
  try {
    const clinicId = routeParam(req.params.clinicId); const doctorId = typeof req.query.doctorId === "string" ? req.query.doctorId : undefined;
    if (!await ownsClinic(req.user!.userId, clinicId)) return res.status(403).json({ success: false, message: "You can only manage your own clinic queue" });
    const entries = await prisma.queueEntry.findMany({ where: { clinicId, queueDate: today(), ...(doctorId ? { doctorId } : {}) }, select: entrySelect(), orderBy: [{ doctorId: "asc" }, { tokenNumber: "asc" }] });
    const groups = new Map<string, Array<any>>();
    for (const entry of entries) groups.set(entry.doctor.id, [...(groups.get(entry.doctor.id) ?? []), entry]);
    return res.status(200).json({ success: true, entries: [...groups.values()].flatMap(enrich) });
  } catch (error) { console.error("Clinic queue error:", error); return res.status(500).json({ success: false, message: "Unable to retrieve clinic queue" }); }
}

const transitions: Record<string, { from: string[]; to: string; timestamp?: "calledAt" | "consultationStartedAt" | "completedAt" }> = {
  call: { from: ["WAITING"], to: "CALLED", timestamp: "calledAt" }, start: { from: ["CALLED"], to: "IN_CONSULTATION", timestamp: "consultationStartedAt" }, complete: { from: ["IN_CONSULTATION"], to: "COMPLETED", timestamp: "completedAt" }, skip: { from: ["WAITING"], to: "SKIPPED" }, noShow: { from: ["WAITING"], to: "NO_SHOW" }, cancel: { from: ["WAITING"], to: "CANCELLED" },
};

export async function updateQueueStatus(req: Request, res: Response) {
  try {
    const clinicId = routeParam(req.params.clinicId); const entryId = routeParam(req.params.entryId); const action = routeParam(req.params.action); const transition = transitions[action];
    if (!transition) return res.status(400).json({ success: false, message: "Invalid queue action" });
    if (!await ownsClinic(req.user!.userId, clinicId)) return res.status(403).json({ success: false, message: "You can only manage your own clinic queue" });
    const entry = await prisma.$transaction(async (tx) => {
      const target = await tx.queueEntry.findFirst({ where: { id: entryId, clinicId, queueDate: today(), status: { in: transition.from as any } }, select: { id: true, doctorId: true, tokenNumber: true, patient: { select: { userId: true } }, doctor: { select: { name: true } }, clinic: { select: { name: true } } } });
      if (!target) throw new Error("INVALID_TRANSITION");
      if (action === "call") {
        const nextWaiting = await tx.queueEntry.findFirst({ where: { clinicId, doctorId: target.doctorId, queueDate: today(), status: "WAITING" }, select: { id: true }, orderBy: { tokenNumber: "asc" } });
        if (!nextWaiting || nextWaiting.id !== entryId) throw new Error("NOT_NEXT_WAITING");
      }
      const data: Record<string, unknown> = { status: transition.to }; if (transition.timestamp) data[transition.timestamp] = new Date();
      await tx.queueEntry.update({ where: { id: entryId }, data });
      const notification = action === "call" ? { type: "YOUR_TURN" as const, message: `It is your turn at ${target.clinic.name}. Please proceed to ${target.doctor.name}.` } : action === "complete" ? { type: "QUEUE_UPDATED" as const, message: `Your consultation with ${target.doctor.name} at ${target.clinic.name} is complete.` } : { type: "QUEUE_UPDATED" as const, message: `Your queue token #${target.tokenNumber} at ${target.clinic.name} is now ${transition.to.replaceAll("_", " ")}.` };
      await tx.notification.create({ data: { userId: target.patient.userId, ...notification } });
      return tx.queueEntry.findUnique({ where: { id: entryId }, select: entrySelect() });
    }, { isolationLevel: "Serializable" });
    return res.status(200).json({ success: true, entry });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "INVALID_TRANSITION") return res.status(409).json({ success: false, message: "Queue entry is not in the required status for this action" });
    if (message === "NOT_NEXT_WAITING") return res.status(409).json({ success: false, message: "Only the next waiting patient can be called" });
    console.error("Queue status update error:", error); return res.status(500).json({ success: false, message: "Unable to update queue status" });
  }
}

export async function cancelMyQueue(req: Request, res: Response) {
  try {
    const entryId = routeParam(req.params.entryId); const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId }, select: { id: true } });
    if (!patient) return res.status(403).json({ success: false, message: "Patient account required" });
    const result = await prisma.queueEntry.updateMany({ where: { id: entryId, patientId: patient.id, queueDate: today(), status: "WAITING" }, data: { status: "CANCELLED" } });
    if (result.count === 0) return res.status(409).json({ success: false, message: "Only a waiting queue entry can be cancelled" });
    return res.status(200).json({ success: true });
  } catch (error) { console.error("Patient queue cancellation error:", error); return res.status(500).json({ success: false, message: "Unable to cancel queue entry" }); }
}
