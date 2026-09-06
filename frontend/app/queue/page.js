"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRequest, clearToken, getToken } from "../lib/auth";

function QueuePageContent() {
  const router = useRouter(); const searchParams = useSearchParams(); const clinicId = searchParams.get("clinicId");
  const [clinic, setClinic] = useState(null); const [entries, setEntries] = useState([]); const [error, setError] = useState(""); const [joining, setJoining] = useState(false);
  const load = useCallback(async () => { try { const mine = await apiRequest("/api/queue/mine/today"); setEntries(mine.entries); if (clinicId) { const data = await apiRequest(`/api/queue/clinics/${clinicId}/doctors`); setClinic(data.clinic); } } catch (requestError) { setError(requestError.message); } }, [clinicId]);
  useEffect(() => { if (!getToken()) { router.replace("/login"); return; } const initial = setTimeout(load, 0); const interval = setInterval(load, 15000); return () => { clearTimeout(initial); clearInterval(interval); }; }, [load, router]);
  async function join(doctorId) { setError(""); setJoining(true); try { await apiRequest("/api/queue/join", { method: "POST", body: JSON.stringify({ clinicId, doctorId }) }); await load(); } catch (requestError) { setError(requestError.message); } finally { setJoining(false); } }
  async function cancel(entryId) { if (!window.confirm("Cancel this queue entry? Your token will no longer be active.")) return; setError(""); try { await apiRequest(`/api/queue/mine/${entryId}/cancel`, { method: "PATCH" }); await load(); } catch (requestError) { setError(requestError.message); } }
  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8"><section className="mx-auto max-w-4xl"><header className="flex items-center justify-between gap-4"><div><Link href="/dashboard" className="font-bold text-teal-700">QueueLess</Link><h1 className="mt-2 text-3xl font-bold">Today&apos;s queue</h1></div><button onClick={() => { clearToken(); router.replace("/login"); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Log out</button></header>{error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
    {clinic && <section className="mt-7 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"><h2 className="text-xl font-bold">Join {clinic.name}</h2><p className="mt-1 text-sm text-slate-600">Choose an active doctor to receive today&apos;s token.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{clinic.doctors.map((doctor) => <article key={doctor.id} className="rounded-lg bg-slate-50 p-4"><strong>{doctor.name}</strong><p className="mt-1 text-sm text-slate-600">{doctor.specialization} · {doctor.consultationDurationMinutes} minutes</p><button disabled={joining} onClick={() => join(doctor.id)} className="mt-3 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Join queue</button></article>)}{clinic.doctors.length === 0 && <p className="text-slate-500">No active doctors are currently available.</p>}</div></section>}
    <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"><h2 className="text-xl font-bold">My queue entries</h2><p className="mt-1 text-sm text-slate-600">Refreshes automatically every 15 seconds.</p><div className="mt-4 space-y-3">{entries.map((entry) => <article key={entry.id} className="rounded-lg bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><strong>{entry.clinic.name} · {entry.doctor.name}</strong><p className="mt-1 text-sm text-slate-600">Token #{entry.tokenNumber} · {entry.status}</p>{entry.position && <p className="mt-1 text-sm">Position {entry.position} · Estimated wait {entry.estimatedWaitingMinutes} min</p>}</div>{entry.status === "WAITING" && <button onClick={() => cancel(entry.id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">Cancel</button>}</div></article>)}{entries.length === 0 && <p className="text-slate-500">You have no queue entries today. Browse an approved clinic to join.</p>}</div></section>
  </section></main>;
}

export default function QueuePage() {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-slate-50 text-slate-600">Loading queue…</main>}><QueuePageContent /></Suspense>;
}
