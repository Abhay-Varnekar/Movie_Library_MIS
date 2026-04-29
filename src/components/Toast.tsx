'use client';

import { useToast } from '@/context/ToastContext';

const VARIANT_CLASSES: Record<string, string> = {
  success: 'border-emerald-500/40 bg-emerald-900/40 text-emerald-100',
  error: 'border-red-500/40 bg-red-900/40 text-red-100',
  info: 'border-zinc-500/40 bg-zinc-800/80 text-zinc-100',
};

export function ToastViewport() {
  const { toasts, dismiss } = useToast();
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-[90vw] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-md border px-4 py-3 shadow-lg backdrop-blur ${
            VARIANT_CLASSES[t.variant] ?? VARIANT_CLASSES.info
          }`}
          role="status"
        >
          <div className="flex items-start justify-between gap-3 text-sm">
            <span className="leading-snug">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="text-xs text-zinc-300 hover:text-white"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
