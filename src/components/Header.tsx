'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export function Header() {
  const { user, profile, loading, signOut } = useAuth();
  const { show } = useToast();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  async function handleSignOut() {
    await signOut();
    show('Signed out.', 'info');
    setMenuOpen(false);
    router.push('/');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          🎬 Movie Library
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link className="hover:text-accent" href="/">
            Home
          </Link>
          <Link className="hover:text-accent" href="/movies">
            Explore
          </Link>
          <Link className="hover:text-accent" href="/movies/graph">
            Graph
          </Link>
          <Link className="hover:text-accent" href="/watchlist">
            Watchlist
          </Link>
          {profile?.is_admin && (
            <Link className="hover:text-accent" href="/admin">
              Admin
            </Link>
          )}

          {loading ? (
            <span className="h-8 w-20 animate-pulse rounded bg-zinc-800" />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-zinc-700 px-2 py-1 hover:border-zinc-500"
              >
                <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-zinc-800 text-xs font-medium uppercase">
                  {profile?.profile_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.profile_image_url}
                      alt={profile.username}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (profile?.username ?? user.email ?? '?').slice(0, 1)
                  )}
                </span>
                <span className="hidden max-w-[8rem] truncate text-sm sm:inline">
                  {profile?.username ?? user.email}
                </span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-md border border-zinc-700 bg-surface shadow-lg">
                  <MenuLink href="/profile" onClick={() => setMenuOpen(false)}>
                    Profile
                  </MenuLink>
                  <MenuLink href="/watchlist" onClick={() => setMenuOpen(false)}>
                    Watchlist
                  </MenuLink>
                  {profile?.is_admin && (
                    <MenuLink href="/admin" onClick={() => setMenuOpen(false)}>
                      Admin
                    </MenuLink>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded border border-zinc-700 px-3 py-1 text-sm hover:border-zinc-500"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded bg-accent px-3 py-1 text-sm font-medium text-white hover:opacity-90"
              >
                Register
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
    >
      {children}
    </Link>
  );
}
