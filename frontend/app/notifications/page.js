"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../lib/auth";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]); const [error, setError] = useState("");
  const load = useCallback(async () => { try { const data = await apiRequest("/api/notifications/mine"); setNotifications(data.notifications); } catch (requestError) { setError(requestError.message); } }, []);
  useEffect(() => { const initial = setTimeout(load, 0); const interval = setInterval(() => { if (document.visibilityState === "visible") load(); }, 15000); return () => { clearTimeout(initial); clearInterval(interval); }; }, [load]);
  async function markRead(id) { try { await apiRequest(`/api/notifications/mine/${id}/read`, { method: "PATCH" }); setNotifications((items) => items.map((item) => item.id === id ? { ...item, isRead: true } : item)); } catch (requestError) { setError(requestError.message); } }
  async function markAllRead() { try { await apiRequest("/api/notifications/mine/read-all", { method: "PATCH" }); setNotifications((items) => items.map((item) => ({ ...item, isRead: true }))); } catch (requestError) { setError(requestError.message); } }
  const unread = notifications.filter((item) => !item.isRead).length;
  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8"><section className="mx-auto max-w-4xl"><header className="flex flex-wrap items-center justify-between gap-4"><div><Link href="/dashboard" className="font-bold text-teal-700">QueueLess</Link><h1 className="mt-2 text-3xl font-bold">Notifications</h1><p className="mt-1 text-slate-600">{unread} unread · refreshes automatically every 15 seconds.</p></div>{unread > 0 && <button onClick={markAllRead} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Mark all read</button>}</header>{error && <p role="alert" className="mt-4 text-red-700">{error}</p>}<div className="mt-6 space-y-3">{notifications.map((notification) => <article key={notification.id} className={`rounded-xl p-5 shadow-sm ring-1 ${notification.isRead ? "bg-white ring-slate-200" : "bg-teal-50 ring-teal-200"}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{notification.message}</p><p className="mt-2 text-sm text-slate-600">{new Date(notification.createdAt).toLocaleString()} · {notification.isRead ? "Read" : "Unread"}</p></div>{!notification.isRead && <button onClick={() => markRead(notification.id)} className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white">Mark read</button>}</div></article>)}{notifications.length === 0 && <p className="text-slate-600">You have no notifications yet.</p>}</div></section></main>;
}
