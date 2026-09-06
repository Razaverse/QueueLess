"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiRequest } from "../../lib/auth";
import ClinicQueueManager from "../../components/ClinicQueueManager";
import ClinicAppointments from "../../components/ClinicAppointments";

const emptyDoctor = { name: "", specialization: "", consultationDurationMinutes: "15" };
const emptySchedule = { dayOfWeek: "1", startTime: "09:00", endTime: "17:00", isActive: true };
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ClinicDashboardPage() {
  const [clinic, setClinic] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [error, setError] = useState("");
  const [doctorForm, setDoctorForm] = useState(emptyDoctor);
  const [scheduleForm, setScheduleForm] = useState(emptySchedule);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const clinicData = await apiRequest("/api/clinics/mine");
        const doctors = clinicData.clinic.doctors ?? (await apiRequest(`/api/clinics/${clinicData.clinic.id}/doctors`)).doctors;
        setClinic(clinicData.clinic);
        setDoctors(doctors);
      } catch (requestError) {
        setError(requestError.message);
      }
    }
    loadDashboard();
  }, []);

  function resetDoctorForm() { setDoctorForm(emptyDoctor); setEditingDoctor(null); }
  function resetScheduleForm() { setScheduleForm(emptySchedule); setEditingSchedule(null); }

  async function saveDoctor(event) {
    event.preventDefault(); setError(""); setSaving(true);
    try {
      const path = editingDoctor ? `/api/clinics/${clinic.id}/doctors/${editingDoctor.id}` : `/api/clinics/${clinic.id}/doctors`;
      const data = await apiRequest(path, { method: editingDoctor ? "PUT" : "POST", body: JSON.stringify({ ...doctorForm, ...(editingDoctor ? { isActive: editingDoctor.isActive } : {}) }) });
      setDoctors((current) => editingDoctor ? current.map((item) => item.id === data.doctor.id ? data.doctor : item) : [...current, data.doctor].sort((a, b) => a.name.localeCompare(b.name)));
      resetDoctorForm();
    } catch (requestError) { setError(requestError.message); } finally { setSaving(false); }
  }

  async function deactivateDoctor(doctorId) {
    if (!window.confirm("Deactivate this doctor? They will no longer be available to patients.")) return;
    setError("");
    try {
      const data = await apiRequest(`/api/clinics/${clinic.id}/doctors/${doctorId}/deactivate`, { method: "PATCH" });
      setDoctors((current) => current.map((item) => item.id === doctorId ? data.doctor : item));
    } catch (requestError) { setError(requestError.message); }
  }

  async function saveSchedule(event, doctorId) {
    event.preventDefault(); setError(""); setSaving(true);
    try {
      const path = editingSchedule ? `/api/clinics/${clinic.id}/doctors/${doctorId}/schedules/${editingSchedule.id}` : `/api/clinics/${clinic.id}/doctors/${doctorId}/schedules`;
      const data = await apiRequest(path, { method: editingSchedule ? "PUT" : "POST", body: JSON.stringify(scheduleForm) });
      setDoctors((current) => current.map((item) => {
        if (item.id !== doctorId) return item;
        const schedules = editingSchedule ? item.schedules.map((entry) => entry.id === data.schedule.id ? data.schedule : entry) : [...item.schedules, data.schedule];
        return { ...item, schedules: schedules.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)) };
      }));
      resetScheduleForm();
    } catch (requestError) { setError(requestError.message); } finally { setSaving(false); }
  }

  function startScheduleEdit(doctorId, schedule) {
    setEditingSchedule({ ...schedule, doctorId });
    setScheduleForm({ dayOfWeek: String(schedule.dayOfWeek), startTime: schedule.startTime, endTime: schedule.endTime, isActive: schedule.isActive });
  }

  if (!clinic) return <main className="grid min-h-screen place-items-center bg-slate-50 text-slate-600">{error || "Loading clinic…"}</main>;

  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8"><section className="mx-auto max-w-4xl">
    <header className="border-b border-slate-200 pb-5"><Link href="/clinic/dashboard" className="text-sm font-semibold text-teal-700 hover:text-teal-900">← Clinic home</Link><div className="mt-3"><p className="font-bold text-teal-700">QueueLess clinic portal</p><h1 className="mt-1 text-2xl font-bold">Clinic dashboard</h1><p className="mt-1 text-slate-600">Manage your clinic, doctors, schedules, queues, and appointments.</p></div></header>
    <section className="mt-7 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-slate-500">Registration status</p><p className="mt-1 inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">{clinic.status}</p><h2 className="mt-5 text-2xl font-bold">{clinic.name}</h2><p className="mt-1 text-slate-600">{clinic.address}, {clinic.city}</p><p className="mt-1 text-slate-600">{clinic.phone} · {clinic.email}</p></div><div className="grid grid-cols-2 gap-3 text-center"><div className="rounded-xl bg-teal-50 px-5 py-3"><p className="text-2xl font-bold text-teal-800">{doctors.filter((doctor) => doctor.isActive).length}</p><p className="text-xs font-semibold text-teal-800">Active doctors</p></div><div className="rounded-xl bg-slate-100 px-5 py-3"><p className="text-2xl font-bold text-slate-800">{doctors.reduce((total, doctor) => total + doctor.schedules.filter((schedule) => schedule.isActive).length, 0)}</p><p className="text-xs font-semibold text-slate-700">Active sessions</p></div></div></div>{clinic.description && <p className="mt-4 text-slate-600">{clinic.description}</p>}<Link href={`/clinics/${clinic.id}`} className="mt-5 inline-block text-sm font-semibold text-teal-700">Preview patient view →</Link></section>
    <section id="doctors" className="mt-6 scroll-mt-24 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"><span id="schedule" className="scroll-mt-24" /><h2 className="text-xl font-bold">Doctor management</h2><p className="mt-1 text-sm text-slate-600">Add doctors, maintain their details, and configure weekly working hours.</p>
      <form onSubmit={saveDoctor} className="mt-5 grid gap-3 sm:grid-cols-4"><input required value={doctorForm.name} onChange={(event) => setDoctorForm((current) => ({ ...current, name: event.target.value }))} placeholder="Doctor name" className="rounded-lg border border-slate-300 px-3 py-2" /><input required value={doctorForm.specialization} onChange={(event) => setDoctorForm((current) => ({ ...current, specialization: event.target.value }))} placeholder="Specialization" className="rounded-lg border border-slate-300 px-3 py-2" /><input required type="number" min="1" max="480" value={doctorForm.consultationDurationMinutes} onChange={(event) => setDoctorForm((current) => ({ ...current, consultationDurationMinutes: event.target.value }))} placeholder="Minutes" className="rounded-lg border border-slate-300 px-3 py-2" /><div className="flex gap-2"><button disabled={saving} className="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : editingDoctor ? "Save doctor" : "Add doctor"}</button>{editingDoctor && <button type="button" onClick={resetDoctorForm} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Cancel</button>}</div></form>
      <div className="mt-5 space-y-4">{doctors.map((doctor) => <article key={doctor.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{doctor.name}</h3><p className="text-sm text-slate-600">{doctor.specialization} · {doctor.consultationDurationMinutes} min consultation</p><p className={`mt-1 text-xs font-semibold ${doctor.isActive ? "text-emerald-700" : "text-slate-500"}`}>{doctor.isActive ? "Active" : "Inactive"}</p></div><div className="flex gap-2"><button type="button" onClick={() => { setEditingDoctor(doctor); setDoctorForm({ name: doctor.name, specialization: doctor.specialization, consultationDurationMinutes: String(doctor.consultationDurationMinutes) }); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Edit</button>{doctor.isActive && <button type="button" onClick={() => deactivateDoctor(doctor.id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">Deactivate</button>}</div></div>
        <div className="mt-4"><h4 className="text-sm font-bold">Working schedule</h4><ul className="mt-2 space-y-2">{doctor.schedules.map((schedule) => <li key={schedule.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span>{days[schedule.dayOfWeek]} · {schedule.startTime}–{schedule.endTime} · {schedule.isActive ? "Active" : "Inactive"}</span><button type="button" onClick={() => startScheduleEdit(doctor.id, schedule)} className="font-semibold text-teal-700">Edit</button></li>)}{doctor.schedules.length === 0 && <li className="text-sm text-slate-500">No working hours configured.</li>}</ul>
          {(!editingSchedule || editingSchedule.doctorId === doctor.id) && <form onSubmit={(event) => saveSchedule(event, doctor.id)} className="mt-3 grid gap-2 sm:grid-cols-5"><select value={scheduleForm.dayOfWeek} onChange={(event) => setScheduleForm((current) => ({ ...current, dayOfWeek: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2">{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</select><input required type="time" value={scheduleForm.startTime} onChange={(event) => setScheduleForm((current) => ({ ...current, startTime: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2" /><input required type="time" value={scheduleForm.endTime} onChange={(event) => setScheduleForm((current) => ({ ...current, endTime: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2" /><label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"><input type="checkbox" checked={scheduleForm.isActive} onChange={(event) => setScheduleForm((current) => ({ ...current, isActive: event.target.checked }))} />Active</label><div className="flex gap-2"><button disabled={saving} className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{editingSchedule ? "Save hours" : "Add hours"}</button>{editingSchedule && <button type="button" onClick={resetScheduleForm} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Cancel</button>}</div></form>}</div>
      </article>)}{doctors.length === 0 && <p className="text-sm text-slate-500">No doctors added yet.</p>}</div>{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}</section>
    <section id="queue" className="scroll-mt-24"><ClinicQueueManager clinicId={clinic.id} /></section>
    <ClinicAppointments clinicId={clinic.id} />
  </section></main>;
}
