import Link from "next/link";

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <section className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <Link href="/" className="text-lg font-bold tracking-tight text-teal-700">
          QueueLess
        </Link>
        <h1 className="mt-7 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
        {children}
        <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>
      </section>
    </main>
  );
}
