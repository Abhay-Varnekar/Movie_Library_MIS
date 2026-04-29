'use client';

import { useState } from 'react';
import type { Review } from '@/lib/types';

interface Props {
  review: Review;
  username?: string;
  profileImage?: string | null;
  showSpoilerToggle?: boolean;
}

export function ReviewCard({
  review,
  username,
  profileImage,
  showSpoilerToggle = true,
}: Props) {
  const [likes, setLikes] = useState(review.likes_count);
  const [liking, setLiking] = useState(false);
  const [reveal, setReveal] = useState(false);
  const date = new Date(review.created_at).toLocaleDateString();

  async function onLike() {
    setLiking(true);
    try {
      const res = await fetch(`/api/reviews/${review.review_id}/like`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = (await res.json()) as { likes_count?: number };
        if (typeof data.likes_count === 'number') setLikes(data.likes_count);
      }
    } finally {
      setLiking(false);
    }
  }

  const hideText = review.is_spoiler && showSpoilerToggle && !reveal;

  return (
    <article className="rounded-lg bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 overflow-hidden rounded-full bg-zinc-800">
            {profileImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profileImage} alt={username ?? 'user'} className="h-full w-full object-cover" />
            )}
          </div>
          <div>
            <div className="text-sm font-medium">{username ?? 'Anonymous'}</div>
            <div className="text-xs text-zinc-500">{date}</div>
          </div>
        </div>
        <div className="text-amber-300 text-sm">★ {review.rating.toFixed(1)}</div>
      </div>
      {review.is_spoiler && (
        <div className="mb-1 text-[10px] uppercase tracking-wide text-amber-400">
          Spoiler warning
        </div>
      )}
      {review.review_text && (
        hideText ? (
          <button
            onClick={() => setReveal(true)}
            className="w-full rounded border border-amber-500/30 bg-amber-900/20 px-3 py-3 text-left text-xs text-amber-200 hover:bg-amber-900/30"
          >
            Click to reveal spoiler review
          </button>
        ) : (
          <p className="text-sm leading-relaxed text-zinc-200">{review.review_text}</p>
        )
      )}
      <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
        <button
          onClick={onLike}
          disabled={liking}
          className="rounded px-2 py-1 hover:bg-zinc-800 disabled:opacity-50"
        >
          ♥ {likes} {likes === 1 ? 'like' : 'likes'}
        </button>
      </div>
    </article>
  );
}
