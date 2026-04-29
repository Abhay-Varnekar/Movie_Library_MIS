'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  buildHref,
  MovieFilters,
  YEAR_MIN,
  YEAR_MAX,
  SortKey,
} from '@/lib/filters';
import type { Genre } from '@/lib/types';

interface Props {
  filters: MovieFilters;
  genres: Genre[];
  languages: string[];
  yearBounds: { min: number; max: number };
}

export function FilterSidebar({ filters, genres, languages, yearBounds }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [q, setQ] = useState(filters.q);
  const [director, setDirector] = useState(filters.director);
  const [yearFrom, setYearFrom] = useState<string>(filters.yearFrom?.toString() ?? '');
  const [yearTo, setYearTo] = useState<string>(filters.yearTo?.toString() ?? '');
  const [minRating, setMinRating] = useState<string>(filters.minRating?.toString() ?? '');

  // Sync local state when URL filters change externally (e.g. clear-all click)
  useEffect(() => {
    setQ(filters.q);
    setDirector(filters.director);
    setYearFrom(filters.yearFrom?.toString() ?? '');
    setYearTo(filters.yearTo?.toString() ?? '');
    setMinRating(filters.minRating?.toString() ?? '');
  }, [filters.q, filters.director, filters.yearFrom, filters.yearTo, filters.minRating]);

  // Debounced URL update for text/numeric inputs
  useEffect(() => {
    const t = setTimeout(() => {
      const next: Partial<MovieFilters> = {
        ...filters,
        q,
        director,
        yearFrom: yearFrom === '' ? null : parseInt(yearFrom, 10) || null,
        yearTo: yearTo === '' ? null : parseInt(yearTo, 10) || null,
        minRating: minRating === '' ? null : parseFloat(minRating) || null,
        page: 1,
      };
      const href = buildHref(pathname, next);
      router.replace(href, { scroll: false });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, director, yearFrom, yearTo, minRating]);

  function pushNow(next: Partial<MovieFilters>) {
    router.push(buildHref(pathname, { ...filters, ...next, page: 1 }), { scroll: false });
  }

  function toggleGenre(id: number) {
    const set = new Set(filters.genres);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    pushNow({ genres: Array.from(set) });
  }

  function toggleLanguage(lang: string) {
    const set = new Set(filters.languages);
    if (set.has(lang)) set.delete(lang);
    else set.add(lang);
    pushNow({ languages: Array.from(set) });
  }

  function setSort(s: SortKey) {
    pushNow({ sort: s });
  }

  function clearAll() {
    router.push(pathname, { scroll: false });
  }

  const minBound = yearBounds.min ?? YEAR_MIN;
  const maxBound = yearBounds.max ?? YEAR_MAX;

  return (
    <aside className="space-y-6 rounded-lg bg-surface p-5 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Filters</h3>
        <button
          onClick={clearAll}
          className="text-xs text-zinc-400 hover:text-accent"
          type="button"
        >
          Clear all
        </button>
      </div>

      <Field label="Search">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="title, director, plot…"
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
        />
      </Field>

      <Field label="Sort by">
        <select
          value={filters.sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
        >
          <option value="latest">Latest added</option>
          <option value="rating">Rating (high→low)</option>
          <option value="year">Year (new→old)</option>
          <option value="title">Title (A→Z)</option>
        </select>
      </Field>

      <Field label={`Genres${filters.genres.length ? ` (${filters.genres.length})` : ''}`}>
        <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto pr-1">
          {genres.map((g) => (
            <label
              key={g.genre_id}
              className="flex cursor-pointer items-center gap-1.5 text-xs"
            >
              <input
                type="checkbox"
                checked={filters.genres.includes(g.genre_id)}
                onChange={() => toggleGenre(g.genre_id)}
                className="accent-accent"
              />
              {g.genre_name}
            </label>
          ))}
        </div>
      </Field>

      <Field label="Year">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={minBound}
            max={maxBound}
            value={yearFrom}
            onChange={(e) => setYearFrom(e.target.value)}
            placeholder={`${minBound}`}
            className="w-1/2 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
          />
          <span className="text-zinc-500">–</span>
          <input
            type="number"
            min={minBound}
            max={maxBound}
            value={yearTo}
            onChange={(e) => setYearTo(e.target.value)}
            placeholder={`${maxBound}`}
            className="w-1/2 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
          />
        </div>
      </Field>

      <Field
        label={`Languages${filters.languages.length ? ` (${filters.languages.length})` : ''}`}
      >
        <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto pr-1">
          {languages.map((lang) => (
            <label key={lang} className="flex cursor-pointer items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={filters.languages.includes(lang)}
                onChange={() => toggleLanguage(lang)}
                className="accent-accent"
              />
              {lang}
            </label>
          ))}
        </div>
      </Field>

      <Field label={`Minimum rating${minRating ? ` (${minRating}+)` : ''}`}>
        <input
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={minRating === '' ? 0 : parseFloat(minRating)}
          onChange={(e) =>
            setMinRating(e.target.value === '0' ? '' : e.target.value)
          }
          className="w-full accent-accent"
        />
        <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
          <span>0</span>
          <span>5</span>
          <span>10</span>
        </div>
      </Field>

      <Field label="Director">
        <input
          type="text"
          value={director}
          onChange={(e) => setDirector(e.target.value)}
          placeholder="partial name…"
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
        />
      </Field>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-400">
        {label}
      </label>
      {children}
    </div>
  );
}
