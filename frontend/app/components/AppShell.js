"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { apiRequest, clearToken, getSessionUser, getToken, saveSessionUser } from "../lib/auth";

const homes = { PATIENT: "/dashboard", CLINIC_ADMIN: "/clinic/dashboard", CLINIC_STAFF: "/clinic/dashboard", PLATFORM_ADMIN: "/admin/clinics" };
export const SessionContext = createContext(null);
const linksByRole = {
  PATIENT: [["Home", "/dashboard"], ["Browse Clinics", "/clinics"], ["My Queue", "/queue"], ["My Appointments", "/appointments"], ["Visit History", "/history"], ["Notifications", "/notifications"]],
  CLINIC_ADMIN: [["Home", "/clinic/dashboard"], ["Clinic Dashboard", "/clinic/dashboard"], ["Doctors", "/clinic/dashboard#doctors"], ["Schedule", "/clinic/dashboard#schedule"], ["Queue", "/clinic/dashboard#queue"], ["Appointments", "/clinic/dashboard#appointments"]],
  CLINIC_STAFF: [["Home", "/clinic/dashboard"], ["Clinic Dashboard", "/clinic/dashboard"], ["Doctors", "/clinic/dashboard#doctors"], ["Schedule", "/clinic/dashboard#schedule"], ["Queue", "/clinic/dashboard#queue"], ["Appointments", "/clinic/dashboard#appointments"]],
  PLATFORM_ADMIN: [["Home", "/admin/clinics"], ["Clinic Approvals", "/admin/clinics"], ["Public Clinics", "/clinics"]],
};

function isPublicRoute(pathname) {
  return pathname === "/" || pathname === "/login" || pathname === "/register" || pathname === "/clinic/register" || pathname === "/clinics" || pathname.startsWith("/clinics/");
}

function canVisit(role, pathname) {
  if (isPublicRoute(pathname)) return true;
  if (role === "PATIENT") return ["/dashboard", "/queue", "/appointments", "/history", "/notifications"].includes(pathname);
  if (role === "CLINIC_ADMIN" || role === "CLINIC_STAFF") return pathname === "/clinic/dashboard";
  return role === "PLATFORM_ADMIN" && pathname === "/admin/clinics";
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(() => getSessionUser());
  const [checking, setChecking] = useState(() => Boolean(getToken()) && !getSessionUser());
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
    if (user && (pathname === "/" || !canVisit(user.role, pathname))) router.replace(homes[user.role] ?? "/login");
  }, [pathname, router, user]);

  const validateSession = useCallback(async () => {
    const currentPath = pathnameRef.current;
    if (!getToken()) {
      setUser(null); setChecking(false);
      if (!isPublicRoute(currentPath)) router.replace("/login");
      return;
    }
    if (!getSessionUser()) setChecking(true);
    try {
      const data = await apiRequest("/api/auth/me");
      saveSessionUser(data.user);
      setUser(data.user);
      if (currentPath === "/" || !canVisit(data.user.role, currentPath)) router.replace(homes[data.user.role] ?? "/login");
    } catch {
      clearToken(); setUser(null);
      if (!isPublicRoute(currentPath)) router.replace("/login");
    } finally { setChecking(false); }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => { if (!cancelled) validateSession(); });
    // A normal route mount already validates above. Revalidate only when the
    // browser restores this page from its back/forward cache.
    const onPageShow = (event) => { if (event.persisted) validateSession(); };
    const onVisibilityChange = () => { if (document.visibilityState === "visible") validateSession(); };
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => { cancelled = true; window.removeEventListener("pageshow", onPageShow); document.removeEventListener("visibilitychange", onVisibilityChange); };
  }, [validateSession]);

  useEffect(() => {
    const onSessionExpired = () => {
      setUser(null);
      setChecking(false);
      if (!isPublicRoute(pathnameRef.current)) router.replace("/login");
    };
    window.addEventListener("queueless-session-expired", onSessionExpired);
    return () => window.removeEventListener("queueless-session-expired", onSessionExpired);
  }, [router]);

  const publicLinks = [["Home", "/"], ["Find a clinic", "/clinics"], ["Sign in", "/login"]];
  const links = user ? linksByRole[user.role] ?? [] : publicLinks;
  const isProtected = !isPublicRoute(pathname);
  const awaitingAuthenticatedRoute = Boolean(getToken()) && !user;
  const home = user ? homes[user.role] ?? "/" : "/";
  function logout() { clearToken(); setUser(null); router.replace("/login"); }

  if ((isProtected && (checking || !user)) || (pathname === "/" && awaitingAuthenticatedRoute)) return <div className="grid min-h-screen place-items-center bg-slate-50 px-4 text-center text-slate-600"><p className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200">Opening your secure session…</p></div>;
  return <SessionContext.Provider value={user}><div className="min-h-screen bg-slate-50 text-slate-900"><header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6"><Link href={home} className="flex items-center gap-2 font-bold tracking-tight text-slate-950"><span className="grid h-8 w-8 place-items-center rounded-xl bg-teal-700 text-sm text-white">Q</span><span>QueueLess</span></Link><nav aria-label="Main navigation" className="order-3 flex w-full gap-1 overflow-x-auto pb-1 text-sm sm:order-2 sm:w-auto sm:flex-1 sm:justify-end sm:pb-0">{links.map(([label, href]) => <Link key={`${label}-${href}`} href={href} className={`whitespace-nowrap rounded-lg px-3 py-2 font-medium transition ${pathname === href.split("#")[0] ? "bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}>{label}</Link>)}</nav>{user ? <button onClick={logout} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Log out</button> : <Link href="/clinic/register" className="hidden text-sm font-semibold text-teal-700 hover:text-teal-900 sm:block">Register clinic</Link>}</div></header>{children}</div></SessionContext.Provider>;
}
