'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AppUser } from '@/lib/types';
import { useToast } from '@/context/ToastContext';

interface Props {
  user: AppUser;
  isCurrentUser: boolean;
}

export function AdminUserRow({ user, isCurrentUser }: Props) {
  const router = useRouter();
  const { show } = useToast();
  const [isActive, setIsActive] = useState(user.is_active);
  const [isAdmin, setIsAdmin] = useState(user.is_admin);
  const [busy, setBusy] = useState(false);

  async function update(body: { is_active?: boolean; is_admin?: boolean }) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${user.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed');
      show('Updated.', 'success');
      router.refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : 'Failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="border-b border-zinc-800 text-sm">
      <td className="px-3 py-2">{user.username}</td>
      <td className="px-3 py-2 text-zinc-400">{user.email}</td>
      <td className="px-3 py-2 text-zinc-400">{user.full_name ?? '—'}</td>
      <td className="px-3 py-2 text-zinc-500">
        {new Date(user.created_at).toLocaleDateString()}
      </td>
      <td className="px-3 py-2">
        <label className="inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={isActive}
            disabled={busy || isCurrentUser}
            onChange={(e) => {
              setIsActive(e.target.checked);
              update({ is_active: e.target.checked });
            }}
          />
          Active
        </label>
      </td>
      <td className="px-3 py-2">
        <label className="inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={isAdmin}
            disabled={busy || isCurrentUser}
            onChange={(e) => {
              setIsAdmin(e.target.checked);
              update({ is_admin: e.target.checked });
            }}
          />
          Admin
        </label>
        {isCurrentUser && (
          <span className="ml-2 text-[10px] uppercase tracking-wider text-zinc-500">
            (you)
          </span>
        )}
      </td>
    </tr>
  );
}
