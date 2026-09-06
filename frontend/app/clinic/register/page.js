"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import AuthLayout from "../../components/AuthLayout";
import { apiRequest } from "../../lib/auth";

const initialForm = { name: "", address: "", city: "", phone: "", email: "", description: "", adminName: "", adminEmail: "", adminPassword: "" };

export default function ClinicRegistrationPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await apiRequest("/api/clinics/register", { method: "POST", body: JSON.stringify(form) });
      router.replace("/login");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Register your clinic" subtitle="Your clinic will be visible to patients once a platform administrator approves it." footer={<>Already have a clinic account? <Link href="/login" className="font-semibold text-teal-700">Sign in</Link></>}>
      <form onSubmit={submit} className="mt-7 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Clinic details</h2>
        <Field label="Clinic name" name="name" value={form.name} onChange={update} />
        <Field label="Address" name="address" value={form.address} onChange={update} />
        <Field label="City" name="city" value={form.city} onChange={update} />
        <Field label="Phone" name="phone" type="tel" value={form.phone} onChange={update} />
        <Field label="Clinic email" name="email" type="email" value={form.email} onChange={update} />
        <Field label="Description (optional)" name="description" value={form.description} onChange={update} required={false} />
        <h2 className="pt-2 text-sm font-bold uppercase tracking-wide text-slate-500">Administrator account</h2>
        <Field label="Administrator name" name="adminName" value={form.adminName} onChange={update} autoComplete="name" />
        <Field label="Administrator email" name="adminEmail" type="email" value={form.adminEmail} onChange={update} autoComplete="email" />
        <Field label="Password" name="adminPassword" type="password" value={form.adminPassword} onChange={update} autoComplete="new-password" hint="At least 6 characters" />
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button disabled={submitting} className="w-full rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800 disabled:opacity-60">{submitting ? "Submitting…" : "Submit clinic for approval"}</button>
      </form>
    </AuthLayout>
  );
}

function Field({ label, hint, required = true, ...props }) {
  return <label className="block text-sm font-medium text-slate-700">{label}<input required={required} {...props} className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />{hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}</label>;
}
