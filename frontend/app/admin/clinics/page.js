"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/auth";

const statusStyles = { PENDING: "bg-amber-50 text-amber-800", APPROVED: "bg-emerald-50 text-emerald-800", REJECTED: "bg-rose-50 text-rose-800", SUSPENDED: "bg-slate-200 text-slate-700" };

export default function AdminClinicsPage() {
  const [clinics, setClinics] = useState([]);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState("");

  async function load() {
    try { setError(""); const data = await apiRequest("/api/admin/clinics"); setClinics(data.clinics); }
    catch (requestError) { setError(requestError.message); }
  }
  useEffect(() => { const initialLoad = window.setTimeout(load, 0); return () => window.clearTimeout(initialLoad); }, []);

  async function update(clinicId, action) {
    const confirmations = { reject: "Reject this clinic registration?", suspend: "Suspend this approved clinic? Patients will no longer discover it." };
    if (confirmations[action] && !window.confirm(confirmations[action])) return;
    setUpdating(`${clinicId}-${action}`);
    try { await apiRequest(`/api/admin/clinics/${clinicId}/${action}`, { method: "PATCH" }); await load(); }
    catch (requestError) { setError(requestError.message); }
    finally { setUpdating(""); }
  }

  const counts = Object.fromEntries(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"].map((status) => [status, clinics.filter((clinic) => clinic.status === status).length]));
  const groups = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"];
  return <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"><section className="rounded-3xl bg-slate-950 px-6 py-8 text-white shadow-sm sm:px-8"><p className="text-sm font-semibold text-teal-300">QueueLess platform administration</p><div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-tight">Clinic operations</h1><p className="mt-2 max-w-2xl text-slate-300">Review registrations, keep clinic availability accurate, and protect the patient directory.</p></div><button onClick={load} className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Refresh</button></div></section>
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
    <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><p className="text-sm font-medium text-slate-500">All registered clinics</p><p className="mt-2 text-3xl font-bold">{clinics.length}</p></article>{groups.map((status) => <article key={status} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><p className="text-sm font-medium text-slate-500">{status[0] + status.slice(1).toLowerCase()}</p><p className="mt-2 text-3xl font-bold">{counts[status]}</p></article>)}</section>
    <section className="mt-7 space-y-6">{groups.map((status) => { const entries = clinics.filter((clinic) => clinic.status === status); return <section key={status} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6"><header className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{status[0] + status.slice(1).toLowerCase()} clinics</h2><p className="mt-1 text-sm text-slate-600">{status === "PENDING" ? "Registrations awaiting a platform decision." : "Current clinic registration status."}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[status]}`}>{entries.length}</span></header><div className="mt-5 grid gap-4 lg:grid-cols-2">{entries.slice(0, 12).map((clinic) => <article key={clinic.id} className="rounded-2xl border border-slate-200 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold">{clinic.name}</h3><p className="mt-1 text-sm text-slate-600">{clinic.address}, {clinic.city}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[clinic.status]}`}>{clinic.status}</span></div><p className="mt-3 text-sm text-slate-600">{clinic.email} · {clinic.phone}</p><p className="mt-3 text-sm text-slate-600"><span className="font-semibold text-slate-800">Clinic administrator:</span> {clinic.staff[0]?.user.name ?? "Not assigned"}</p><p className="mt-1 text-xs text-slate-500">Registered {new Date(clinic.createdAt).toLocaleDateString()}</p><div className="mt-5 flex flex-wrap gap-2">{clinic.status === "PENDING" && <><button disabled={Boolean(updating)} onClick={() => update(clinic.id, "approve")} className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{updating === `${clinic.id}-approve` ? "Approving…" : "Approve"}</button><button disabled={Boolean(updating)} onClick={() => update(clinic.id, "reject")} className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 disabled:opacity-60">{updating === `${clinic.id}-reject` ? "Rejecting…" : "Reject"}</button></>}{clinic.status === "APPROVED" && <button disabled={Boolean(updating)} onClick={() => update(clinic.id, "suspend")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60">{updating === `${clinic.id}-suspend` ? "Suspending…" : "Suspend"}</button>}</div></article>)}{entries.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">No {status.toLowerCase()} clinics right now.</p>}</div></section>; })}</section>
  </main>;
}
