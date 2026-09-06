"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest, clearToken, getToken } from "../lib/auth";

const linksByRole = {
  PATIENT: [["Home", "/dashboard"], ["Browse Clinics", "/clinics"], ["My Queue", "/queue"], ["My Appointments", "/appointments"], ["Visit History", "/history"], ["Notifications", "/notifications"]],
  CLINIC_ADMIN: [["Home", "/clinic/dashboard"], ["Clinic Dashboard", "/clinic/dashboard"], ["Doctors", "/clinic/dashboard#doctors"], ["Schedule", "/clinic/dashboard#schedule"], ["Queue", "/clinic/dashboard#queue"], ["Appointments", "/clinic/dashboard#appointments"]],
  CLINIC_STAFF: [["Home", "/clinic/dashboard"], ["Clinic Dashboard", "/clinic/dashboard"], ["Doctors", "/clinic/dashboard#doctors"], ["Schedule", "/clinic/dashboard#schedule"], ["Queue", "/clinic/dashboard#queue"], ["Appointments", "/clinic/dashboard#appointments"]],
  PLATFORM_ADMIN: [["Home", "/admin/clinics"], ["Clinic Approvals", "/admin/clinics"], ["Public Clinics", "/clinics"]],
};

export default function AppShell({ children }) {
  const pathname = usePathname(); const router = useRouter(); const [user, setUser] = useState(null);
  useEffect(() => { let active = true; if (!getToken()) return () => { active = false; }; apiRequest("/api/auth/me").then((data) => { if (active) setUser(data.user); }).catch(() => { clearToken(); if (active) setUser(null); }); return () => { active = false; }; }, [pathname]);
  const publicLinks = [["Home", "/"], ["Find a clinic", "/clinics"], ["Sign in", "/login"]];
  const links = user ? linksByRole[user.role] ?? [] : publicLinks;
  function logout() { clearToken(); setUser(null); router.replace("/login"); }
  return <div className="min-h-screen bg-slate-50 text-slate-900"><header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6"><Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-slate-950"><span className="grid h-8 w-8 place-items-center rounded-xl bg-teal-700 text-sm text-white">Q</span><span>QueueLess</span></Link><nav aria-label="Main navigation" className="order-3 flex w-full gap-1 overflow-x-auto pb-1 text-sm sm:order-2 sm:w-auto sm:flex-1 sm:justify-end sm:pb-0">{links.map(([label, href]) => <Link key={`${label}-${href}`} href={href} className={`whitespace-nowrap rounded-lg px-3 py-2 font-medium transition ${pathname === href.split("#")[0] ? "bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}>{label}</Link>)}</nav>{user ? <button onClick={logout} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Log out</button> : <Link href="/clinic/register" className="hidden text-sm font-semibold text-teal-700 hover:text-teal-900 sm:block">Register clinic</Link>}</div></header>{children}</div>;
}
