"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AuthLayout from "../components/AuthLayout";
import { apiRequest, clearToken, getSessionUser, getToken, saveSessionUser, saveToken } from "../lib/auth";
import { routeForRole } from "../lib/redirects";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!getToken()) return;
    const cachedUser = getSessionUser();
    if (cachedUser) {
      router.replace(routeForRole(cachedUser.role));
      return;
    }
    apiRequest("/api/auth/me")
      .then((data) => { saveSessionUser(data.user); router.replace(routeForRole(data.user.role)); })
      .catch(() => clearToken());

  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      saveToken(data.token);
      saveSessionUser(data.user);
      router.replace(routeForRole(data.user.role));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your QueueLess patient account."
      footer={<>New to QueueLess? <Link href="/register" className="font-semibold text-teal-700 hover:text-teal-800">Create an account</Link></>}
    >
      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        <label className="block text-sm font-medium text-slate-700">Email address
          <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
        </label>
        <label className="block text-sm font-medium text-slate-700">Password
          <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
        </label>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button disabled={isSubmitting} className="w-full rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60">
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
}
