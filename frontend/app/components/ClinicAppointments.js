"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../lib/auth";

const statuses = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"];

export default function ClinicAppointments({ clinicId }) {
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");
  const load = useCallback(async () => { try { const data = await apiRequest(`/api/appointments/clinics/${clinicId}`); setAppointments(data.appointments); } catch (requestError) { setError(requestError.message); } }, [clinicId]);
  useEffect(() => { const initialLoad = window.setTimeout(load, 0); return () => window.clearTimeout(initialLoad); }, [load]);
  async function setStatus(appointment, status) {
    if (["CANCELLED", "NO_SHOW"].includes(status) && !window.confirm(`Mark this appointment as ${status.toLowerCase().replace("_", " ")}?`)) return;
    setSaving(appointment.id);
    try { await apiRequest(`/api/appointments/clinics/${clinicId}/${appointment.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }); await load(); }
    catch (requestError) { setError(requestError.message); }
    finally { setSaving(""); }
  }
  return <section id="appointments" className="mt-6 scroll-mt-24 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Appointments</h2><p className="mt-1 text-sm text-slate-600">Review and update appointments scheduled with your clinic.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{appointments.length} total</span></div>{error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="mt-4 space-y-3">{appointments.map((appointment) => <article key={appointment.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{appointment.patient.user.name}</h3><p className="mt-1 text-sm text-slate-600">{appointment.doctor.name} · {appointment.doctor.specialization}</p><p className="mt-1 text-sm text-slate-600">{new Date(appointment.startTime).toLocaleString()}</p></div><label className="text-sm font-semibold text-slate-700"><span className="sr-only">Appointment status for {appointment.patient.user.name}</span><select disabled={saving === appointment.id} value={appointment.status} onChange={(event) => setStatus(appointment, event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:opacity-60">{statuses.map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}</select></label></div></article>)}{appointments.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">No appointments have been scheduled for this clinic.</p>}</div></section>;
}
