'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { Movie, WatchlistItem, WatchlistStatus } from '@/lib/types';
import { useToast } from '@/context/ToastContext';

export interface WatchlistRow extends WatchlistItem {
  movie: Movie | null;
}

const STATUS_LABEL: Record<WatchlistStatus | 'all', string> = {
  all: 'All',
  plan_to_watch: 'Plan to watch',
  watching: 'Watching',
  completed: 'Completed',
};

type SortKey = 'date_added' | 'rating' | 'year';

interface Props {
  initialRows: WatchlistRow[];
}

export function WatchlistView({ initialRows }: Props) {
  const router = useRouter();
  const { show } = useToast();
  const [rows, setRows] = useState<WatchlistRow[]>(initialRows);
  const [tab, setTab] = useState<WatchlistStatus | 'all'>('all');
  const [sort, setSort] = useState<SortKey>('date_added');
  const [busy, setBusy] = useState(false);

  const breakdown = useMemo(() => {
    const out: Record<WatchlistStatus, number> = {
      plan_to_watch: 0,
      watching: 0,
      completed: 0,
    };
    rows.forEach((r) => {
      out[r.status] = (out[r.status] ?? 0) + 1;
    });
    return out;
  }, [rows]);

  const filtered = useMemo(() => {
    const list = tab === 'all' ? rows : rows.filter((r) => r.status === tab);
    return [...list].sort((a, b) => {
      if (sort === 'date_added') {
        return new Date(b.date_added).getTime() - new Date(a.date_added).getTime();
      }
      if (sort === 'rating') {
        return (b.movie?.rating_imdb ?? 0) - (a.movie?.rating_imdb ?? 0);
      }
      return (b.movie?.release_year ?? 0) - (a.movie?.release_year ?? 0);
    });
  }, [rows, tab, sort]);

  async function changeStatus(id: string, status: WatchlistStatus) {
    setBusy(true);
    try {
      const res = await fetch(`/api/watchlist/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed');
      setRows((prev) =>
        prev.map((r) => (r.watchlist_id === id ? { ...r, status } : r))
      );
      show(`Marked ${STATUS_LABEL[status]}`, 'success');
    } catch (err) {
      show(err instanceof Error ? err.message : 'Failed to update', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/watchlist/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed');
      setRows((prev) => prev.filter((r) => r.watchlist_id !== id));
      show('Removed.', 'info');
    } catch (err) {
      show(err instanceof Error ? err.message : 'Failed to remove', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function removeAll() {
    if (!rows.length) return;
    if (!confirm(`Remove all ${rows.length} items from your watchlist?`)) return;
    setBusy(true);
    try {
      await Promise.all(
        rows.map((r) =>
          fetch(`/api/watchlist/${r.watchlist_id}`, { method: 'DELETE' })
        )
      );
      setRows([]);
      show('Watchlist cleared.', 'info');
      router.refresh();
    } catch {
      show('Some items could not be removed.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* Stats card */}
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <Stat label="Total" value={rows.length} />
        <Stat label="Plan to watch" value={breakdown.plan_to_watch} />
        <Stat label="Watching" value={breakdown.watching} />
        <Stat label="Completed" value={breakdown.completed} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex flex-wrap gap-1 rounded-md border border-zinc-800 bg-surface p-1">
          {(['all', 'plan_to_watch', 'watching', 'completed'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded px-3 py-1 text-xs ${
                tab === t
                  ? 'bg-accent text-white'
                  : 'text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              {STATUS_LABEL[t]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-zinc-400">
            Sort by{' '}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded border border-zinc-700 bg-bg px-2 py-1 text-xs"
            >
              <option value="date_added">Date added</option>
              <option value="rating">Rating</option>
              <option value="year">Year</option>
            </select>
          </label>
          {rows.length > 0 && (
            <button
              onClick={removeAll}
              disabled={busy}
              className="rounded border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-red-500 hover:text-red-300 disabled:opacity-50"
            >
              Remove all
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg bg-surface p-6 text-center text-sm text-zinc-400">
          {rows.length === 0
            ? 'Your watchlist is empty. Browse movies and add some.'
            : 'Nothing in this tab.'}
        </div>
      ) : (
        <ul className="grid gap-3">
          {filtered.map((row) => (
            <WatchlistRowCard
              key={row.watchlist_id}
              row={row}
              busy={busy}
              onStatus={(s) => changeStatus(row.watchlist_id, s)}
              onRemove={() => remove(row.watchlist_id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface p-4">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

function WatchlistRowCard({
  row,
  busy,
  onStatus,
  onRemove,
}: {
  row: WatchlistRow;
  busy: boolean;
  onStatus: (s: WatchlistStatus) => void;
  onRemove: () => void;
}) {
  const m = row.movie;
  const date = new Date(row.date_added).toLocaleDateString();
  return (
    <li className="flex gap-4 rounded-lg bg-surface p-3">
      <div className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded bg-zinc-800">
        {m?.poster_url && (
          <Image
            src={m.poster_url}
            alt={m.title}
            fill
            sizes="64px"
            className="object-cover"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <Link
            href={m ? `/movies/${m.movie_id}` : '#'}
            className="font-medium hover:text-accent"
          >
            {m?.title ?? 'Movie unavailable'}
          </Link>
          <span className="text-xs text-zinc-500">Added {date}</span>
        </div>
        <div className="mt-0.5 text-xs text-zinc-400">
          {m?.release_year ?? '—'} · ★ {m?.rating_imdb?.toFixed(1) ?? '—'}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={row.status}
            onChange={(e) => onStatus(e.target.value as WatchlistStatus)}
            disabled={busy}
            className="rounded border border-zinc-700 bg-bg px-2 py-1 text-xs"
          >
            <option value="plan_to_watch">Plan to watch</option>
            <option value="watching">Watching</option>
            <option value="completed">Completed</option>
          </select>
          <button
            onClick={onRemove}
            disabled={busy}
            className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-red-500 hover:text-red-300 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}
