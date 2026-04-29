'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AppUser } from '@/lib/types';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { createBrowserClient } from '@/lib/supabase-browser';

interface Props {
  profile: AppUser;
}

export function ProfileEditForm({ profile }: Props) {
  const router = useRouter();
  const { show } = useToast();
  const { refreshProfile } = useAuth();

  const [username, setUsername] = useState(profile.username);
  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [imageUrl, setImageUrl] = useState(profile.profile_image_url ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkUsernameUnique(): Promise<boolean> {
    if (username === profile.username) return true;
    const supabase = createBrowserClient();
    const { data, error: qErr } = await supabase
      .from('users')
      .select('user_id')
      .eq('username', username)
      .maybeSingle();
    if (qErr) return true;
    return !data;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!/^[a-z0-9_]{3,50}$/i.test(username)) {
      setError('Username must be 3–50 chars, letters/digits/underscores only.');
      return;
    }

    setSubmitting(true);

    const ok = await checkUsernameUnique();
    if (!ok) {
      setSubmitting(false);
      setError('That username is taken.');
      return;
    }

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          full_name: fullName,
          bio,
          profile_image_url: imageUrl,
        }),
      });
      if (res.status === 409) {
        setError('That username is taken.');
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Update failed');
      }
      show('Profile updated.', 'success');
      await refreshProfile();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label="Username">
        <input
          type="text"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value.trim())}
          className="w-full rounded border border-zinc-700 bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </Field>
      <Field label="Full name">
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded border border-zinc-700 bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </Field>
      <Field label="Profile image URL">
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://…"
          className="w-full rounded border border-zinc-700 bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </Field>
      <Field label="Bio">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className="w-full resize-y rounded border border-zinc-700 bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </Field>
      {error && (
        <div className="rounded border border-red-500/40 bg-red-900/30 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded bg-accent px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">
        {label}
      </span>
      {children}
    </label>
  );
}
