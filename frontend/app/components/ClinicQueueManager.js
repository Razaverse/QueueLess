"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../lib/auth";

const labels = { WAITING: "Call next", CALLED: "Start consultation", IN_CONSULTATION: "Complete" };
const actions = { WAITING: "call", CALLED: "start", IN_CONSULTATION: "complete" };

export default function ClinicQueueManager({ clinicId }) {
  const [entries, setEntries] = useState([]); const [error, setError] = useState("");
  const load = useCallback(async () => { try { const data = await apiRequest(`/api/queue/clinics/${clinicId}`); setEntries(data.entries); } catch (requestError) { setError(requestError.message); } }, [clinicId]);
  useEffect(() => { const initial = setTimeout(load, 0); const interval = setInterval(() => { if (document.visibilityState === "visible") load(); }, 15000); return () => { clearTimeout(initial); clearInterval(interval); }; }, [load]);
  async function change(entry, action) { const destructive = ["skip", "noShow", "cancel"].includes(action); if (destructive && !window.confirm(`Mark token #${entry.tokenNumber} as ${action === "noShow" ? "no-show" : action}?`)) return; setError(""); try { await apiRequest(`/api/queue/clinics/${clinicId}/entries/${entry.id}/${action}`, { method: "PATCH" }); await load(); } catch (requestError) { setError(requestError.message); } }
  return <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"><h2 className="text-xl font-bold">Today&apos;s queue</h2><p className="mt-1 text-sm text-slate-600">Refreshes automatically every 15 seconds.</p>{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}<div className="mt-4 space-y-3">{entries.map((entry) => <article key={entry.id} className="rounded-lg bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><strong>#{entry.tokenNumber} · {entry.patient.user.name}</strong><p className="mt-1 text-sm text-slate-600">{entry.doctor.name} · {entry.status}</p>{entry.position && <p className="mt-1 text-sm">Position {entry.position} · ETA {entry.estimatedWaitingMinutes} min</p>}</div><div className="flex flex-wrap gap-2">{actions[entry.status] && <button onClick={() => change(entry, actions[entry.status])} className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white">{labels[entry.status]}</button>}{entry.status === "WAITING" && <><button onClick={() => change(entry, "skip")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Skip</button><button onClick={() => change(entry, "noShow")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">No-show</button><button onClick={() => change(entry, "cancel")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Cancel</button></>}</div></div></article>)}{entries.length === 0 && <p className="text-slate-500">No entries in today&apos;s queue.</p>}</div></section>;
}
