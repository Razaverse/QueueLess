"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/auth";

export default function ClinicDetailsClient({ clinicId }) {
  const [clinic, setClinic] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    apiRequest(`/api/clinics/${clinicId}`, { signal: controller.signal })
      .then((data) => setClinic(data.clinic))
      .catch((requestError) => { if (requestError.name !== "AbortError") setError(requestError.message); });
    return () => controller.abort();
  }, [clinicId]);
  if (!clinic && !error) return <main className="grid min-h-screen place-items-center bg-slate-50 text-slate-600">Loading clinic…</main>;
  if (error) return <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center"><div><p className="text-red-700">{error}</p><Link href="/clinics" className="mt-3 inline-block font-semibold text-teal-700">Back to clinics</Link></div></main>;
  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8"><section className="mx-auto max-w-4xl"><Link href="/clinics" className="text-sm font-semibold text-teal-700">← All clinics</Link><article className="mt-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8"><p className="font-bold text-teal-700">QueueLess clinic</p><h1 className="mt-2 text-3xl font-bold">{clinic.name}</h1><div className="mt-6 grid gap-4 text-slate-700 sm:grid-cols-2"><p><strong>Address</strong><br />{clinic.address}, {clinic.city}</p><p><strong>Contact</strong><br />{clinic.phone}<br />{clinic.email}</p></div>{clinic.description && <p className="mt-6 leading-7 text-slate-600">{clinic.description}</p>}<h2 className="mt-8 text-xl font-bold">Available doctors</h2><ul className="mt-4 grid gap-3 sm:grid-cols-2">{clinic.doctors.map((doctor) => <li key={doctor.id} className="rounded-lg bg-slate-50 p-4"><strong>{doctor.name}</strong><p className="mt-1 text-sm text-slate-600">{doctor.specialization}</p></li>)}{clinic.doctors.length === 0 && <li className="text-slate-600">Doctor profiles will be available soon.</li>}</ul>{clinic.doctors.length > 0 && <Link href={`/queue?clinicId=${clinic.id}`} className="mt-6 inline-block rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white">Join today&apos;s queue</Link>}</article></section></main>;
}
