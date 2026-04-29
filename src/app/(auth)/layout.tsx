import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-surface p-6 shadow-2xl">
        <Link
          href="/"
          className="mb-4 inline-block text-xs uppercase tracking-widest text-zinc-500 hover:text-accent"
        >
          ← Back to home
        </Link>
        {children}
      </div>
    </main>
  );
}
