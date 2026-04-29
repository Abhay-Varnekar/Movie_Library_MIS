'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { WatchlistItem, WatchlistStatus } from '@/lib/types';
import { createBrowserClient } from '@/lib/supabase-browser';

const STATUS_LABEL: Record<WatchlistStatus, string> = {
  plan_to_watch: 'Plan to watch',
  watching: 'Watching',
  completed: 'Completed',
};

const STATUS_OPTIONS: WatchlistStatus[] = ['plan_to_watch', 'watching', 'completed'];

export function WatchlistButton({ movieId }: { movieId: number }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { show } = useToast();

  const [item, setItem] = useState<WatchlistItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) {
        setItem(null);
        setHydrating(false);
        return;
      }
      const supabase = createBrowserClient();
      const { data } = await supabase
        .from('watchlist')
        .select('*')
        .eq('movie_id', movieId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      setItem((data as WatchlistItem | null) ?? null);
      setHydrating(false);
    }
    setHydrating(true);
    load();
    return () => {
      cancelled = true;
    };
  }, [user, movieId]);

  if (loading || hydrating) {
    return <div className="h-9 w-full animate-pulse rounded bg-zinc-800" />;
  }

  if (!user) {
    return (
      <Link
        href={`/login?redirectTo=/movies/${movieId}`}
        className="inline-block rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
      >
        Sign in to add to watchlist
      </Link>
    );
  }

  async function add(status: WatchlistStatus) {
    setBusy(true);
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movie_id: movieId, status }),
      });
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed');
      const body = (await res.json()) as { item: WatchlistItem };
      setItem(body.item);
      show(`Added — ${STATUS_LABEL[status]}`, 'success');
      router.refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : 'Failed to add', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(status: WatchlistStatus) {
    if (!item) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/watchlist/${item.watchlist_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed');
      const body = (await res.json()) as { item: WatchlistItem };
      setItem(body.item);
      show(`Status updated → ${STATUS_LABEL[status]}`, 'success');
      router.refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : 'Failed to update', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!item) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/watchlist/${item.watchlist_id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed');
      setItem(null);
      show('Removed from watchlist.', 'info');
      router.refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : 'Failed to remove', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!item) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-xs text-zinc-400">Add to watchlist as…</span>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              disabled={busy}
              onClick={() => add(s)}
              className="rounded border border-zinc-700 px-3 py-1.5 text-xs hover:border-accent disabled:opacity-50"
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-zinc-400">In your watchlist</div>
      <select
        value={item.status}
        onChange={(e) => changeStatus(e.target.value as WatchlistStatus)}
        disabled={busy}
        className="rounded border border-zinc-700 bg-bg px-2 py-1.5 text-sm"
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <button
        onClick={remove}
        disabled={busy}
        className="rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-red-500 hover:text-red-300 disabled:opacity-50"
      >
        Remove
      </button>
    </div>
  );
}
