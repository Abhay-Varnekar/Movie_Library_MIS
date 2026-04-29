'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { Review } from '@/lib/types';

interface Props {
  movieId: number;
  existingReview: Review | null;
}

export function ReviewForm({ movieId, existingReview }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const { show } = useToast();

  const [rating, setRating] = useState<number>(existingReview?.rating ?? 8);
  const [text, setText] = useState<string>(existingReview?.review_text ?? '');
  const [isSpoiler, setIsSpoiler] = useState<boolean>(existingReview?.is_spoiler ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRating(existingReview?.rating ?? 8);
    setText(existingReview?.review_text ?? '');
    setIsSpoiler(existingReview?.is_spoiler ?? false);
  }, [existingReview]);

  if (!user) return null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = existingReview
        ? await fetch(`/api/reviews/${existingReview.review_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating, review_text: text, is_spoiler: isSpoiler }),
          })
        : await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              movie_id: movieId,
              rating,
              review_text: text,
              is_spoiler: isSpoiler,
            }),
          });
      if (!res.ok) {
        const body = await safeJson(res);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      show(existingReview ? 'Review updated.' : 'Review posted.', 'success');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (!existingReview) return;
    if (!confirm('Delete your review?')) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/reviews/${existingReview.review_id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await safeJson(res);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      show('Review deleted.', 'success');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete review.');
    } finally {
      setSubmitting(false);
    }
  }

  const ratingOptions: number[] = [];
  for (let r = 1; r <= 10; r += 0.5) ratingOptions.push(Number(r.toFixed(1)));

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-zinc-800 bg-surface p-4 text-sm"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          {existingReview ? 'Edit your review' : 'Write a review'}
        </h3>
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-400">Rating</label>
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="rounded border border-zinc-700 bg-bg px-2 py-1 text-sm"
          >
            {ratingOptions.map((r) => (
              <option key={r} value={r}>
                {r.toFixed(1)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Your thoughts (optional)…"
        rows={4}
        className="mt-3 w-full resize-y rounded border border-zinc-700 bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <label className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
        <input
          type="checkbox"
          checked={isSpoiler}
          onChange={(e) => setIsSpoiler(e.target.checked)}
        />
        Contains spoilers
      </label>
      {error && (
        <div className="mt-3 rounded border border-red-500/40 bg-red-900/30 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-accent px-4 py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {submitting
            ? 'Saving…'
            : existingReview
              ? 'Update review'
              : 'Post review'}
        </button>
        {existingReview && (
          <button
            type="button"
            onClick={onDelete}
            disabled={submitting}
            className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-red-500 hover:text-red-300 disabled:opacity-50"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}

async function safeJson(res: Response): Promise<{ error?: string } | null> {
  try {
    return (await res.json()) as { error?: string };
  } catch {
    return null;
  }
}
