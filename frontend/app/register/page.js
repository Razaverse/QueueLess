"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import AuthLayout from "../components/AuthLayout";
import { apiRequest } from "../lib/auth";

const initialForm = { name: "", email: "", phone: "", password: "", confirmPassword: "" };

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
        }),
      });
      router.replace("/login");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your patient account"
      subtitle="Register to use QueueLess for your clinic visits."
      footer={<>Already have an account? <Link href="/login" className="font-semibold text-teal-700 hover:text-teal-800">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        <Field label="Full name" name="name" value={form.name} onChange={updateField} autoComplete="name" />
        <Field label="Email address" name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" />
        <Field label="Phone number (optional)" name="phone" type="tel" value={form.phone} onChange={updateField} autoComplete="tel" required={false} />
        <Field label="Password" name="password" type="password" value={form.password} onChange={updateField} autoComplete="new-password" hint="At least 6 characters" />
        <Field label="Confirm password" name="confirmPassword" type="password" value={form.confirmPassword} onChange={updateField} autoComplete="new-password" />
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button disabled={isSubmitting} className="w-full rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60">
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}

function Field({ label, hint, required = true, ...inputProps }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input required={required} {...inputProps} className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
      {hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  );
}
