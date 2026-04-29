import Link from 'next/link';
import { Suspense } from 'react';
import { LoginForm } from './LoginForm';

export const metadata = {
  title: 'Sign in — Movie Library',
};

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Welcome back. Sign in to manage your watchlist and reviews.
      </p>
      <Suspense
        fallback={<div className="mt-6 h-40 animate-pulse rounded bg-zinc-800/40" />}
      >
        <LoginForm />
      </Suspense>
      <p className="mt-4 text-center text-xs text-zinc-400">
        No account?{' '}
        <Link href="/register" className="text-accent hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
