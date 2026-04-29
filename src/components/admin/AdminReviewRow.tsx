'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import type { Review } from '@/lib/types';

interface Props {
  review: Review;
  movieTitle?: string | null;
  username?: string | null;
}

export function AdminReviewRow({ review, movieTitle, username }: Props) {
  const router = useRouter();
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const [isApproved, setIsApproved] = useState(review.is_approved);

  async function setApproved(next: boolean) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/reviews/${review.review_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_approved: next }),
      });
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed');
      setIsApproved(next);
      show(next ? 'Review approved.' : 'Review hidden.', 'success');
      router.refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : 'Failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm('Permanently delete this review?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/reviews/${review.review_id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed');
      show('Review deleted.', 'success');
      router.refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : 'Failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-lg border border-zinc-800 bg-surface p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-zinc-400">
          <Link
            href={`/movies/${review.movie_id}`}
            className="font-medium text-zinc-200 hover:text-accent"
          >
            {movieTitle ?? `Movie #${review.movie_id}`}
          </Link>{' '}
          · by {username ?? 'unknown'} · ★ {review.rating.toFixed(1)} ·{' '}
          {new Date(review.created_at).toLocaleDateString()}
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
            isApproved
              ? 'bg-emerald-900/40 text-emerald-200'
              : 'bg-amber-900/40 text-amber-200'
          }`}
        >
          {isApproved ? 'approved' : 'pending'}
        </span>
      </div>
      {review.is_spoiler && (
        <div className="mt-1 text-[10px] uppercase tracking-wider text-amber-400">
          spoiler
        </div>
      )}
      {review.review_text && (
        <p className="mt-2 whitespace-pre-line text-zinc-200">
          {review.review_text}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {isApproved ? (
          <button
            onClick={() => setApproved(false)}
            disabled={busy}
            className="rounded border border-zinc-700 px-2 py-1 text-xs hover:border-amber-500 hover:text-amber-300 disabled:opacity-50"
          >
            Unapprove
          </button>
        ) : (
          <button
            onClick={() => setApproved(true)}
            disabled={busy}
            className="rounded bg-emerald-700/60 px-3 py-1 text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            Approve
          </button>
        )}
        <button
          onClick={remove}
          disabled={busy}
          className="rounded border border-zinc-700 px-2 py-1 text-xs hover:border-red-500 hover:text-red-300 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
