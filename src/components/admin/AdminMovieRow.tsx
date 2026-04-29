'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Movie } from '@/lib/types';
import { useToast } from '@/context/ToastContext';

interface Props {
  movie: Movie;
}

export function AdminMovieRow({ movie }: Props) {
  const router = useRouter();
  const { show } = useToast();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: movie.title,
    director: movie.director ?? '',
    release_year: movie.release_year ?? '',
    language: movie.language ?? '',
    rating_imdb: movie.rating_imdb ?? '',
    is_active: movie.is_active,
  });

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/movies/${movie.movie_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          director: form.director || null,
          release_year:
            form.release_year === '' ? null : Number(form.release_year),
          language: form.language || null,
          rating_imdb:
            form.rating_imdb === '' ? null : Number(form.rating_imdb),
          is_active: form.is_active,
        }),
      });
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed');
      show('Saved.', 'success');
      setEditing(false);
      router.refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function softDelete() {
    if (!confirm(`Deactivate "${movie.title}"?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/movies/${movie.movie_id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed');
      show('Movie deactivated.', 'success');
      router.refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : 'Failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <tr className="border-b border-zinc-800 text-sm">
        <td className="px-3 py-2">{movie.movie_id}</td>
        <td className="px-3 py-2">{movie.title}</td>
        <td className="px-3 py-2 text-zinc-400">{movie.director ?? '—'}</td>
        <td className="px-3 py-2 text-zinc-400">{movie.release_year ?? '—'}</td>
        <td className="px-3 py-2 text-zinc-400">{movie.language ?? '—'}</td>
        <td className="px-3 py-2 text-amber-300">
          {movie.rating_imdb?.toFixed(1) ?? '—'}
        </td>
        <td className="px-3 py-2">
          {movie.is_active ? (
            <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs text-emerald-200">
              active
            </span>
          ) : (
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
              inactive
            </span>
          )}
        </td>
        <td className="px-3 py-2 text-right">
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditing(true)}
              className="rounded border border-zinc-700 px-2 py-1 text-xs hover:border-accent"
            >
              Edit
            </button>
            <button
              onClick={softDelete}
              disabled={busy || !movie.is_active}
              className="rounded border border-zinc-700 px-2 py-1 text-xs hover:border-red-500 hover:text-red-300 disabled:opacity-40"
            >
              Deactivate
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-zinc-800 bg-zinc-900/60 text-sm">
      <td className="px-3 py-2">{movie.movie_id}</td>
      <td className="px-3 py-2">
        <input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className="w-full rounded border border-zinc-700 bg-bg px-2 py-1 text-xs"
        />
      </td>
      <td className="px-3 py-2">
        <input
          value={form.director}
          onChange={(e) => setForm((f) => ({ ...f, director: e.target.value }))}
          className="w-full rounded border border-zinc-700 bg-bg px-2 py-1 text-xs"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          value={form.release_year}
          onChange={(e) =>
            setForm((f) => ({ ...f, release_year: e.target.value }))
          }
          className="w-20 rounded border border-zinc-700 bg-bg px-2 py-1 text-xs"
        />
      </td>
      <td className="px-3 py-2">
        <input
          value={form.language}
          onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
          className="w-24 rounded border border-zinc-700 bg-bg px-2 py-1 text-xs"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          step="0.1"
          value={form.rating_imdb}
          onChange={(e) =>
            setForm((f) => ({ ...f, rating_imdb: e.target.value }))
          }
          className="w-16 rounded border border-zinc-700 bg-bg px-2 py-1 text-xs"
        />
      </td>
      <td className="px-3 py-2">
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) =>
              setForm((f) => ({ ...f, is_active: e.target.checked }))
            }
          />
          Active
        </label>
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex justify-end gap-2">
          <button
            onClick={save}
            disabled={busy}
            className="rounded bg-accent px-2 py-1 text-xs font-medium hover:opacity-90 disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            disabled={busy}
            className="rounded border border-zinc-700 px-2 py-1 text-xs hover:border-zinc-500"
          >
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}
