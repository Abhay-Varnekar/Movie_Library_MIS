export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg bg-surface">
      <div className="aspect-[2/3] w-full animate-pulse bg-zinc-800" />
      <div className="p-3">
        <div className="h-3 w-3/4 animate-pulse rounded bg-zinc-800" />
        <div className="mt-2 h-2 w-1/2 animate-pulse rounded bg-zinc-800" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
