import Link from 'next/link';
import { buildHref, MovieFilters } from '@/lib/filters';

interface Props {
  filters: MovieFilters;
  totalPages: number;
  pathname: string;
}

export function Pagination({ filters, totalPages, pathname }: Props) {
  if (totalPages <= 1) return null;
  const cur = filters.page;
  const pages = pageRange(cur, totalPages);

  return (
    <nav className="mt-8 flex items-center justify-center gap-1 text-sm">
      <PageLink
        disabled={cur <= 1}
        href={buildHref(pathname, { ...filters, page: cur - 1 })}
        label="‹ Prev"
      />
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`e-${i}`} className="px-2 text-zinc-500">
            …
          </span>
        ) : (
          <PageLink
            key={p}
            href={buildHref(pathname, { ...filters, page: p })}
            label={String(p)}
            active={p === cur}
          />
        )
      )}
      <PageLink
        disabled={cur >= totalPages}
        href={buildHref(pathname, { ...filters, page: cur + 1 })}
        label="Next ›"
      />
    </nav>
  );
}

function PageLink({
  href,
  label,
  active,
  disabled,
}: {
  href: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span className="cursor-not-allowed rounded border border-zinc-800 px-3 py-1 text-zinc-600">
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      scroll={false}
      className={
        active
          ? 'rounded border border-accent bg-accent/20 px-3 py-1 font-medium text-white'
          : 'rounded border border-zinc-800 px-3 py-1 text-zinc-300 hover:border-accent hover:text-white'
      }
    >
      {label}
    </Link>
  );
}

function pageRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const out: (number | '…')[] = [1];
  if (current > 3) out.push('…');
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    out.push(p);
  }
  if (current < total - 2) out.push('…');
  out.push(total);
  return out;
}
