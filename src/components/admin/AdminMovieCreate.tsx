'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';

export function AdminMovieCreate() {
  const router = useRouter();
  const { show } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: '',
    director: '',
    release_year: '',
    language: '',
    rating_imdb: '',
    description: '',
    poster_url: '',
    banner_url: '',
  });

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/admin/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          director: form.director || null,
          release_year:
            form.release_year === '' ? null : Number(form.release_year),
          language: form.language || null,
          rating_imdb:
            form.rating_imdb === '' ? null : Number(form.rating_imdb),
          description: form.description || null,
          poster_url: form.poster_url || null,
          banner_url: form.banner_url || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed');
      show('Movie created.', 'success');
      setForm({
        title: '',
        director: '',
        release_year: '',
        language: '',
        rating_imdb: '',
        description: '',
        poster_url: '',
        banner_url: '',
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : 'Create failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded bg-accent px-3 py-1.5 text-sm font-medium hover:opacity-90"
      >
        + Add new movie
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-lg border border-zinc-800 bg-surface p-4 text-sm sm:grid-cols-2"
    >
      <Field label="Title">
        <input
          required
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className="w-full rounded border border-zinc-700 bg-bg px-2 py-1"
        />
      </Field>
      <Field label="Director">
        <input
          value={form.director}
          onChange={(e) => setForm((f) => ({ ...f, director: e.target.value }))}
          className="w-full rounded border border-zinc-700 bg-bg px-2 py-1"
        />
      </Field>
      <Field label="Release year">
        <input
          type="number"
          value={form.release_year}
          onChange={(e) =>
            setForm((f) => ({ ...f, release_year: e.target.value }))
          }
          className="w-full rounded border border-zinc-700 bg-bg px-2 py-1"
        />
      </Field>
      <Field label="Language">
        <input
          value={form.language}
          onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
          className="w-full rounded border border-zinc-700 bg-bg px-2 py-1"
        />
      </Field>
      <Field label="IMDb rating">
        <input
          type="number"
          step="0.1"
          min="0"
          max="10"
          value={form.rating_imdb}
          onChange={(e) =>
            setForm((f) => ({ ...f, rating_imdb: e.target.value }))
          }
          className="w-full rounded border border-zinc-700 bg-bg px-2 py-1"
        />
      </Field>
      <Field label="Poster URL">
        <input
          value={form.poster_url}
          onChange={(e) =>
            setForm((f) => ({ ...f, poster_url: e.target.value }))
          }
          className="w-full rounded border border-zinc-700 bg-bg px-2 py-1"
        />
      </Field>
      <Field label="Banner URL">
        <input
          value={form.banner_url}
          onChange={(e) =>
            setForm((f) => ({ ...f, banner_url: e.target.value }))
          }
          className="w-full rounded border border-zinc-700 bg-bg px-2 py-1"
        />
      </Field>
      <Field label="Description" className="sm:col-span-2">
        <textarea
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
          rows={3}
          className="w-full rounded border border-zinc-700 bg-bg px-2 py-1"
        />
      </Field>
      <div className="flex gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-accent px-3 py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Create'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={busy}
          className="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:border-zinc-500"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">
        {label}
      </span>
      {children}
    </label>
  );
}
