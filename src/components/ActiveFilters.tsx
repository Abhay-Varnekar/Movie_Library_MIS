'use client';

import { useRouter, usePathname } from 'next/navigation';
import { buildHref, MovieFilters } from '@/lib/filters';
import type { Genre } from '@/lib/types';

interface Props {
  filters: MovieFilters;
  genres: Genre[];
  totalCount: number;
}

export function ActiveFilters({ filters, genres, totalCount }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const chips: { key: string; label: string; remove: () => void }[] = [];

  if (filters.q) {
    chips.push({
      key: 'q',
      label: `“${filters.q}”`,
      remove: () => router.push(buildHref(pathname, { ...filters, q: '', page: 1 })),
    });
  }
  if (filters.director) {
    chips.push({
      key: 'director',
      label: `Director: ${filters.director}`,
      remove: () =>
        router.push(buildHref(pathname, { ...filters, director: '', page: 1 })),
    });
  }
  filters.genres.forEach((id) => {
    const name = genres.find((g) => g.genre_id === id)?.genre_name ?? `#${id}`;
    chips.push({
      key: `g-${id}`,
      label: name,
      remove: () => {
        const next = filters.genres.filter((x) => x !== id);
        router.push(buildHref(pathname, { ...filters, genres: next, page: 1 }));
      },
    });
  });
  filters.languages.forEach((lang) => {
    chips.push({
      key: `l-${lang}`,
      label: lang,
      remove: () => {
        const next = filters.languages.filter((x) => x !== lang);
        router.push(buildHref(pathname, { ...filters, languages: next, page: 1 }));
      },
    });
  });
  if (filters.yearFrom != null || filters.yearTo != null) {
    chips.push({
      key: 'year',
      label: `Year ${filters.yearFrom ?? '?'} – ${filters.yearTo ?? '?'}`,
      remove: () =>
        router.push(buildHref(pathname, { ...filters, yearFrom: null, yearTo: null, page: 1 })),
    });
  }
  if (filters.minRating != null) {
    chips.push({
      key: 'rating',
      label: `Rating ≥ ${filters.minRating}`,
      remove: () =>
        router.push(buildHref(pathname, { ...filters, minRating: null, page: 1 })),
    });
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-sm text-zinc-400">{totalCount} movies</span>
      {chips.length > 0 && <span className="text-zinc-600">·</span>}
      {chips.map((c) => (
        <button
          key={c.key}
          onClick={c.remove}
          type="button"
          className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-0.5 text-xs text-zinc-200 hover:border-accent hover:text-accent"
        >
          {c.label} ✕
        </button>
      ))}
    </div>
  );
}
