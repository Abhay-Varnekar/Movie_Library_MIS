'use client';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded border border-zinc-700 bg-surface px-3 py-1.5 text-xs hover:border-zinc-500 print:hidden"
    >
      Export PDF
    </button>
  );
}
