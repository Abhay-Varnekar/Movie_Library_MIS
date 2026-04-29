/**
 * URL-param parsing/serializing for the movies explore page.
 * Single source of truth so server components, FilterSidebar, and ActiveFilters all agree.
 */

export type SortKey = 'latest' | 'rating' | 'year' | 'title';

export interface MovieFilters {
  q: string;
  genres: number[];
  languages: string[];
  yearFrom: number | null;
  yearTo: number | null;
  minRating: number | null;
  director: string;
  sort: SortKey;
  page: number;
}

export const DEFAULT_FILTERS: MovieFilters = {
  q: '',
  genres: [],
  languages: [],
  yearFrom: null,
  yearTo: null,
  minRating: null,
  director: '',
  sort: 'latest',
  page: 1,
};

export const PAGE_SIZE = 12;
export const YEAR_MIN = 1990;
export const YEAR_MAX = 2024;

const SORT_KEYS: SortKey[] = ['latest', 'rating', 'year', 'title'];

function intArray(s: string | undefined): number[] {
  if (!s) return [];
  return s
    .split(',')
    .map((x) => parseInt(x, 10))
    .filter((n) => Number.isFinite(n));
}

function strArray(s: string | undefined): string[] {
  if (!s) return [];
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function intOrNull(s: string | undefined): number | null {
  if (s === undefined || s === '') return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function floatOrNull(s: string | undefined): number | null {
  if (s === undefined || s === '') return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export function parseFilters(
  sp: Record<string, string | string[] | undefined> | URLSearchParams
): MovieFilters {
  const get = (k: string): string | undefined => {
    if (sp instanceof URLSearchParams) return sp.get(k) ?? undefined;
    const v = sp[k];
    if (Array.isArray(v)) return v[0];
    return v;
  };

  const sortRaw = (get('sort') as SortKey) ?? 'latest';
  const sort: SortKey = SORT_KEYS.includes(sortRaw) ? sortRaw : 'latest';
  const pageRaw = intOrNull(get('page'));
  const page = pageRaw && pageRaw > 0 ? pageRaw : 1;

  return {
    q: (get('q') ?? '').trim(),
    genres: intArray(get('genre')),
    languages: strArray(get('language')),
    yearFrom: intOrNull(get('year_from')),
    yearTo: intOrNull(get('year_to')),
    minRating: floatOrNull(get('min_rating')),
    director: (get('director') ?? '').trim(),
    sort,
    page,
  };
}

export function buildSearchParams(f: Partial<MovieFilters>): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.q) sp.set('q', f.q);
  if (f.genres && f.genres.length) sp.set('genre', f.genres.join(','));
  if (f.languages && f.languages.length) sp.set('language', f.languages.join(','));
  if (f.yearFrom != null) sp.set('year_from', String(f.yearFrom));
  if (f.yearTo != null) sp.set('year_to', String(f.yearTo));
  if (f.minRating != null) sp.set('min_rating', String(f.minRating));
  if (f.director) sp.set('director', f.director);
  if (f.sort && f.sort !== 'latest') sp.set('sort', f.sort);
  if (f.page && f.page > 1) sp.set('page', String(f.page));
  return sp;
}

export function buildHref(pathname: string, f: Partial<MovieFilters>): string {
  const sp = buildSearchParams(f);
  const qs = sp.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function isFilterActive(f: MovieFilters): boolean {
  return (
    f.q.length > 0 ||
    f.genres.length > 0 ||
    f.languages.length > 0 ||
    f.yearFrom != null ||
    f.yearTo != null ||
    f.minRating != null ||
    f.director.length > 0 ||
    f.sort !== 'latest'
  );
}

export function activeFilterCount(f: MovieFilters): number {
  let n = 0;
  if (f.q) n++;
  if (f.genres.length) n++;
  if (f.languages.length) n++;
  if (f.yearFrom != null) n++;
  if (f.yearTo != null) n++;
  if (f.minRating != null) n++;
  if (f.director) n++;
  return n;
}
