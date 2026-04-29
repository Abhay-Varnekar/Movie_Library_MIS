'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS: Array<{ href: string; label: string }> = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/movies', label: 'Movies' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/reviews', label: 'Reviews' },
  { href: '/admin/analytics', label: 'Analytics' },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 rounded-md border border-zinc-800 bg-surface p-1 text-xs">
      {TABS.map((t) => {
        const active =
          pathname === t.href || (t.href !== '/admin' && pathname?.startsWith(t.href));
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded px-3 py-1.5 transition ${
              active ? 'bg-accent text-white' : 'text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
