'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const ACCENT = '#e50914';
const PALETTE = [
  '#e50914',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#a855f7',
  '#ec4899',
  '#22d3ee',
  '#84cc16',
  '#f97316',
  '#eab308',
  '#06b6d4',
  '#d946ef',
  '#14b8a6',
  '#fb7185',
  '#8b5cf6',
];

interface TooltipPayload {
  payload?: Record<string, unknown>;
  value?: number | string;
  name?: string;
  color?: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-zinc-700 bg-zinc-900/95 px-2 py-1.5 text-xs shadow-lg">
      {label != null && (
        <div className="mb-1 text-zinc-300">{String(label)}</div>
      )}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5">
          {p.color && (
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: p.color }}
            />
          )}
          <span className="text-zinc-400">{p.name ?? 'value'}:</span>
          <span className="font-medium text-zinc-100">{String(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/** Rating histogram (1..10 buckets) */
export function RatingHistogramChart({
  data,
}: {
  data: Array<{ bucket: string; count: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="bucket" stroke="#71717a" fontSize={11} />
        <YAxis stroke="#71717a" fontSize={11} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(229,9,20,0.08)' }} />
        <Bar dataKey="count" fill={ACCENT} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Reviews over time (last 90 days) */
export function ReviewsTimelineChart({
  data,
}: {
  data: Array<{ day: string; count: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="day"
          stroke="#71717a"
          fontSize={10}
          interval={Math.max(0, Math.floor(data.length / 8) - 1)}
        />
        <YAxis stroke="#71717a" fontSize={11} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="count"
          stroke={ACCENT}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: ACCENT }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Top directors horizontal bar w/ avg rating */
export function DirectorsBarChart({
  data,
}: {
  data: Array<{ director: string; avg_rating: number; count: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, 28 * data.length)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 36, left: 8, bottom: 4 }}
      >
        <CartesianGrid stroke="#27272a" strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          stroke="#71717a"
          fontSize={11}
          domain={[0, 10]}
          ticks={[0, 2, 4, 6, 8, 10]}
        />
        <YAxis
          type="category"
          dataKey="director"
          stroke="#71717a"
          fontSize={11}
          width={140}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0].payload as {
              director: string;
              avg_rating: number;
              count: number;
            };
            return (
              <div className="rounded border border-zinc-700 bg-zinc-900/95 px-2 py-1.5 text-xs shadow-lg">
                <div className="mb-1 font-medium text-zinc-100">{row.director}</div>
                <div className="text-zinc-300">Avg rating: {row.avg_rating.toFixed(2)}</div>
                <div className="text-zinc-300">Movies: {row.count}</div>
              </div>
            );
          }}
          cursor={{ fill: 'rgba(229,9,20,0.08)' }}
        />
        <Bar dataKey="avg_rating" fill={ACCENT} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Genre share donut */
export function GenreDonutChart({
  data,
}: {
  data: Array<{ genre: string; count: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="genre"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          stroke="#0b0d12"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }}
          iconSize={8}
          layout="horizontal"
          verticalAlign="bottom"
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
