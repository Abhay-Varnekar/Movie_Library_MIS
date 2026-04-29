'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GraphNode, GraphEdge, GraphPayload } from '@/app/api/graph/route';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface GraphData {
  nodes: GraphNode[];
  links: GraphEdge[];
}

const COLORS: Record<GraphNode['type'], string> = {
  movie: '#e50914',
  actor: '#3b82f6',
  genre: '#10b981',
};

const TYPE_LABEL: Record<GraphNode['type'], string> = {
  movie: 'Movie',
  actor: 'Actor',
  genre: 'Genre',
};

export function GraphClient() {
  const [limit, setLimit] = useState(30);
  const [showMovies, setShowMovies] = useState(true);
  const [showActors, setShowActors] = useState(true);
  const [showGenres, setShowGenres] = useState(true);
  const [search, setSearch] = useState('');
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [stats, setStats] = useState<GraphPayload['stats'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fgRef = useRef<unknown>(null);

  // Resize observer for canvas size
  useEffect(() => {
    function update() {
      if (!containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      setSize({ w: Math.max(320, Math.floor(r.width)), h: Math.max(400, Math.floor(r.height)) });
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Fetch graph data
  useEffect(() => {
    let aborted = false;
    setLoading(true);
    setError(null);
    fetch(`/api/graph?limit=${limit}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<GraphPayload>;
      })
      .then((payload) => {
        if (aborted) return;
        setData({ nodes: payload.nodes, links: payload.edges });
        setStats(payload.stats);
        setSelected(null);
      })
      .catch((e: unknown) => {
        if (aborted) return;
        setError(e instanceof Error ? e.message : 'Failed to load graph');
      })
      .finally(() => {
        if (!aborted) setLoading(false);
      });
    return () => {
      aborted = true;
    };
  }, [limit]);

  // Filter view by toggles + search highlight
  const view = useMemo<GraphData>(() => {
    const allowed = new Set<GraphNode['type']>();
    if (showMovies) allowed.add('movie');
    if (showActors) allowed.add('actor');
    if (showGenres) allowed.add('genre');
    const nodes = data.nodes.filter((n) => allowed.has(n.type));
    const ids = new Set(nodes.map((n) => n.id));
    const links = data.links.filter(
      (e) => ids.has(typeof e.source === 'string' ? e.source : (e.source as { id: string }).id) &&
            ids.has(typeof e.target === 'string' ? e.target : (e.target as { id: string }).id)
    );
    return { nodes, links };
  }, [data, showMovies, showActors, showGenres]);

  const lowerSearch = search.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!lowerSearch) return new Set<string>();
    return new Set(
      view.nodes.filter((n) => n.label.toLowerCase().includes(lowerSearch)).map((n) => n.id)
    );
  }, [view.nodes, lowerSearch]);

  // Center on first match when search changes
  useEffect(() => {
    if (!lowerSearch || !fgRef.current) return;
    const first = view.nodes.find((n) => matches.has(n.id)) as
      | (GraphNode & { x?: number; y?: number })
      | undefined;
    if (first?.x != null && first?.y != null) {
      const fg = fgRef.current as {
        centerAt: (x: number, y: number, ms: number) => void;
        zoom: (z: number, ms: number) => void;
      };
      fg.centerAt(first.x, first.y, 600);
      fg.zoom(3, 600);
    }
  }, [lowerSearch, matches, view.nodes]);

  // Neighbours of selected (1-hop) for highlighting
  const neighbourIds = useMemo(() => {
    if (!selected) return new Set<string>();
    const s = new Set<string>([selected.id]);
    for (const e of view.links) {
      const src = typeof e.source === 'string' ? e.source : (e.source as { id: string }).id;
      const tgt = typeof e.target === 'string' ? e.target : (e.target as { id: string }).id;
      if (src === selected.id) s.add(tgt);
      if (tgt === selected.id) s.add(src);
    }
    return s;
  }, [selected, view.links]);

  const nodeColor = useCallback(
    (node: GraphNode) => {
      const base = COLORS[node.type];
      if (lowerSearch) {
        return matches.has(node.id) ? '#facc15' : dim(base);
      }
      if (selected) {
        return neighbourIds.has(node.id) ? base : dim(base);
      }
      return base;
    },
    [matches, lowerSearch, selected, neighbourIds]
  );

  const drawNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, scale: number) => {
      const n = node as GraphNode & { x?: number; y?: number };
      if (n.x == null || n.y == null) return;
      const r = Math.sqrt(node.val) * 1.6;
      const color = nodeColor(node);
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      if (selected?.id === node.id || matches.has(node.id)) {
        ctx.lineWidth = 2 / scale;
        ctx.strokeStyle = '#fef9c3';
        ctx.stroke();
      }
      // Label only at sufficient zoom or for high-degree nodes
      if (scale > 1.4 || node.val > 8) {
        const label = node.label.length > 28 ? node.label.slice(0, 27) + '…' : node.label;
        const fontSize = Math.max(2.5, 10 / scale);
        ctx.font = `${fontSize}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#e4e4e7';
        ctx.fillText(label, n.x, n.y + r + 1);
      }
    },
    [nodeColor, selected, matches]
  );

  const linkColor = useCallback(
    (edge: GraphEdge) => {
      if (selected) {
        const src = typeof edge.source === 'string'
          ? edge.source
          : (edge.source as { id: string }).id;
        const tgt = typeof edge.target === 'string'
          ? edge.target
          : (edge.target as { id: string }).id;
        if (src === selected.id || tgt === selected.id) return 'rgba(250,204,21,0.6)';
        return 'rgba(82,82,91,0.18)';
      }
      return 'rgba(113,113,122,0.35)';
    },
    [selected]
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr,320px]">
      <div className="space-y-3">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 bg-surface p-3 text-xs">
          <input
            type="search"
            placeholder="Search title, actor, genre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 rounded border border-zinc-700 bg-bg px-2 py-1.5 text-sm outline-none focus:border-accent"
          />
          <label className="flex items-center gap-2">
            <span className="text-zinc-400">Movies</span>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value, 10))}
              className="accent-accent"
            />
            <span className="w-8 text-zinc-200">{limit}</span>
          </label>
          <Toggle on={showMovies} setOn={setShowMovies} color={COLORS.movie} label="Movies" />
          <Toggle on={showActors} setOn={setShowActors} color={COLORS.actor} label="Actors" />
          <Toggle on={showGenres} setOn={setShowGenres} color={COLORS.genre} label="Genres" />
          <button
            onClick={() => {
              setSearch('');
              setSelected(null);
              setShowMovies(true);
              setShowActors(true);
              setShowGenres(true);
            }}
            className="ml-auto rounded border border-zinc-700 px-2 py-1 hover:border-zinc-500"
          >
            Reset
          </button>
        </div>

        {/* Graph canvas */}
        <div
          ref={containerRef}
          className="relative h-[70vh] overflow-hidden rounded-lg border border-zinc-800 bg-[#07090d]"
        >
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg/60 text-sm text-zinc-400">
              Loading graph…
            </div>
          )}
          {error && (
            <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-red-300">
              {error}
            </div>
          )}
          {!loading && !error && view.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">
              Nothing to show — adjust filters.
            </div>
          )}
          {!loading && !error && view.nodes.length > 0 && (
            <ForceGraph2D
              ref={fgRef as never}
              graphData={view}
              width={size.w}
              height={size.h}
              backgroundColor="#07090d"
              cooldownTicks={120}
              nodeRelSize={4}
              nodeCanvasObject={drawNode as never}
              nodeCanvasObjectMode={() => 'replace'}
              linkColor={linkColor as never}
              linkWidth={1}
              onNodeClick={(node: object) => setSelected(node as GraphNode)}
              onBackgroundClick={() => setSelected(null)}
            />
          )}
        </div>

        {stats && (
          <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
            <span><b className="text-zinc-200">{stats.movies}</b> movies</span>
            <span><b className="text-zinc-200">{stats.actors}</b> actors</span>
            <span><b className="text-zinc-200">{stats.genres}</b> genres</span>
            <span><b className="text-zinc-200">{stats.edges}</b> connections</span>
          </div>
        )}
      </div>

      {/* Side panel */}
      <aside className="rounded-lg border border-zinc-800 bg-surface p-4 text-sm">
        {selected ? (
          <SelectedPanel node={selected} onClose={() => setSelected(null)} />
        ) : (
          <div className="space-y-3 text-zinc-400">
            <h3 className="text-sm font-semibold text-zinc-100">How to read this</h3>
            <p>
              Top {limit} highest-rated movies, their genres, and up to 5 leading
              cast each. Node size reflects how connected it is.
            </p>
            <ul className="space-y-1 text-xs">
              <li>• Click a node to highlight its 1-hop neighbours.</li>
              <li>• Drag any node — physics will respond.</li>
              <li>• Wheel scroll to zoom, drag empty space to pan.</li>
              <li>• Search jumps to the first match.</li>
            </ul>
            <div className="rounded border border-zinc-800 bg-bg p-3 text-xs">
              <p className="text-zinc-300">Insight</p>
              <p className="mt-1 text-zinc-500">
                Hub actors appear at intersections — they are the cast that
                bridge multiple genres. Hub genres absorb many movies. Together
                they map the &ldquo;shape&rdquo; of the catalogue.
              </p>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function Toggle({
  on,
  setOn,
  color,
  label,
}: {
  on: boolean;
  setOn: (v: boolean) => void;
  color: string;
  label: string;
}) {
  return (
    <button
      onClick={() => setOn(!on)}
      className={`flex items-center gap-1.5 rounded border px-2 py-1 transition ${
        on ? 'border-zinc-600 bg-zinc-800 text-zinc-100' : 'border-zinc-800 text-zinc-500'
      }`}
    >
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: on ? color : '#3f3f46' }}
      />
      {label}
    </button>
  );
}

function SelectedPanel({ node, onClose }: { node: GraphNode; onClose: () => void }) {
  const detailHref =
    node.type === 'movie' && node.movieId
      ? `/movies/${node.movieId}`
      : node.type === 'actor' && node.actorId
        ? `/movies/actor/${node.actorId}`
        : null;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-zinc-500">
            {TYPE_LABEL[node.type]}
          </div>
          <h3 className="text-base font-semibold text-zinc-100">{node.label}</h3>
        </div>
        <button
          onClick={onClose}
          className="rounded border border-zinc-700 px-2 py-0.5 text-xs hover:border-zinc-500"
        >
          ✕
        </button>
      </div>
      {node.poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={node.poster}
          alt={node.label}
          className="h-48 w-full rounded object-cover"
        />
      )}
      <dl className="space-y-1 text-xs">
        {node.year != null && (
          <Row k="Year" v={String(node.year)} />
        )}
        {node.rating != null && (
          <Row k="Rating" v={`${node.rating.toFixed(1)} / 10`} />
        )}
        <Row k="Connections" v={String(Math.round(node.val))} />
      </dl>
      {detailHref && (
        <Link
          href={detailHref}
          className="inline-block rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          Open detail →
        </Link>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-zinc-800/60 py-1">
      <dt className="text-zinc-500">{k}</dt>
      <dd className="text-zinc-200">{v}</dd>
    </div>
  );
}

function dim(hex: string): string {
  // Convert to rgba w/ alpha 0.18
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const v = parseInt(m[1], 16);
  const r = (v >> 16) & 0xff;
  const g = (v >> 8) & 0xff;
  const b = v & 0xff;
  return `rgba(${r},${g},${b},0.18)`;
}
