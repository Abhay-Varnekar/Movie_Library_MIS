'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase-browser';
import { useToast } from '@/context/ToastContext';

export default function RegisterPage() {
  const { show } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    const supabase = createBrowserClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    setSuccess(true);
    show('Account created — you can now sign in.', 'success');
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Reviews, watchlist, profile — all yours after you register.
      </p>
      {success ? (
        <div className="mt-6 rounded border border-emerald-500/40 bg-emerald-900/30 px-4 py-4 text-sm text-emerald-100">
          Account created! You can now{' '}
          <Link href="/login" className="font-medium underline">
            sign in
          </Link>
          .
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Full name">
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded border border-zinc-700 bg-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-zinc-700 bg-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-zinc-700 bg-bg px-3 py-2 text-sm text-white outline-none focus:border-accent"
            />
          </Field>
          {error && (
            <div className="rounded border border-red-500/40 bg-red-900/30 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-accent px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      )}
      <p className="mt-4 text-center text-xs text-zinc-400">
        Already have an account?{' '}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">
        {label}
      </span>
      {children}
    </label>
  );
}
