import { Suspense } from 'react';
import { parseFilters } from '@/lib/filters';
import {
  fetchMovies,
  fetchAllGenres,
  fetchAllLanguages,
  fetchYearRange,
} from '@/lib/queries';
import { FilterSidebar } from '@/components/FilterSidebar';
import { ActiveFilters } from '@/components/ActiveFilters';
import { MovieGrid } from '@/components/MovieGrid';
import { Pagination } from '@/components/Pagination';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Explore — Movie Library',
};

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFilters(searchParams);

  const [genresData, languages, yearBounds, list] = await Promise.all([
    fetchAllGenres(),
    fetchAllLanguages(),
    fetchYearRange(),
    fetchMovies(filters),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Explore movies</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[16rem_1fr]">
        <FilterSidebar
          filters={filters}
          genres={genresData}
          languages={languages}
          yearBounds={yearBounds}
        />

        <section>
          <ActiveFilters
            filters={filters}
            genres={genresData}
            totalCount={list.total}
          />
          <Suspense fallback={null}>
            <MovieGrid movies={list.movies} />
          </Suspense>
          <Pagination filters={filters} totalPages={list.totalPages} pathname="/movies" />
        </section>
      </div>
    </main>
  );
}
