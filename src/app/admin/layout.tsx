import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase-server';
import { AdminNav } from '@/components/AdminNav';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin — Movie Library',
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentUser();
  // 404 (rather than 403) so non-admins don't even learn the route exists.
  if (!profile?.is_admin) notFound();

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin panel</h1>
          <p className="text-xs text-zinc-400">Signed in as {profile.username}</p>
        </div>
        <AdminNav />
      </header>
      {children}
    </main>
  );
}
