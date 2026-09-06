import type { Request, Response } from "express";
import prisma from "../db.js";

function routeParam(value: string | string[]) { return Array.isArray(value) ? value[0] : value; }

export async function getMyNotifications(req: Request, res: Response) {
  try { const notifications = await prisma.notification.findMany({ where: { userId: req.user!.userId }, select: { id: true, type: true, message: true, isRead: true, createdAt: true }, orderBy: { createdAt: "desc" } }); return res.json({ success: true, notifications }); } catch (error) { console.error("Notification listing error:", error); return res.status(500).json({ success: false, message: "Unable to retrieve notifications" }); }
}
export async function markNotificationRead(req: Request, res: Response) {
  try { const id = routeParam(req.params.notificationId); const result = await prisma.notification.updateMany({ where: { id, userId: req.user!.userId }, data: { isRead: true } }); if (!result.count) return res.status(404).json({ success: false, message: "Notification not found" }); return res.json({ success: true }); } catch (error) { console.error("Notification update error:", error); return res.status(500).json({ success: false, message: "Unable to update notification" }); }
}
export async function markAllNotificationsRead(req: Request, res: Response) {
  try { await prisma.notification.updateMany({ where: { userId: req.user!.userId, isRead: false }, data: { isRead: true } }); return res.json({ success: true }); } catch (error) { console.error("Notification bulk update error:", error); return res.status(500).json({ success: false, message: "Unable to update notifications" }); }
}
