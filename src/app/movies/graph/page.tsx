import dynamic from 'next/dynamic';

export const metadata = {
  title: 'Movie Graph — Movie Library',
  description:
    'Interactive force-directed graph of movies, actors, and genres. Drag, zoom, and click to explore the library.',
};

const GraphClient = dynamic(() => import('./GraphClient').then((m) => m.GraphClient), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] items-center justify-center text-sm text-zinc-500">
      Loading graph engine…
    </div>
  ),
});

export default function MovieGraphPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Movie Universe <span className="text-accent">·</span> Graph
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Every red node is a movie, blue is an actor, green is a genre. Edges
            join movies to their cast and genres. Drag nodes to rearrange,
            scroll to zoom, click for detail.
          </p>
        </div>
        <div className="hidden gap-3 text-xs text-zinc-500 sm:flex">
          <Legend color="#e50914" label="Movie" />
          <Legend color="#3b82f6" label="Actor" />
          <Legend color="#10b981" label="Genre" />
        </div>
      </div>
      <GraphClient />
    </main>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-3 w-3 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
