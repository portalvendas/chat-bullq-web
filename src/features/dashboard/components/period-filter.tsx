'use client';

import { CalendarDays } from 'lucide-react';

/** Filtro de período ÚNICO, compartilhado por todas as abas do Dashboard. */
export type DashPeriod = 'hoje' | '7d' | '30d' | '90d' | 'mes' | 'tudo' | 'custom';

export const PERIOD_PRESETS: Array<{ v: DashPeriod; label: string }> = [
  { v: 'hoje', label: 'Hoje' },
  { v: '7d', label: '7 dias' },
  { v: '30d', label: '30 dias' },
  { v: '90d', label: '90 dias' },
  { v: 'mes', label: 'Este mês' },
  { v: 'tudo', label: 'Tudo' },
  { v: 'custom', label: 'Personalizado' },
];

/** Converte o período (+ datas custom) em { from, to } ISO. "Tudo" = desde 2020. */
export function periodRange(
  p: DashPeriod,
  customFrom?: string,
  customTo?: string,
): { from: string; to: string } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);
  switch (p) {
    case 'hoje': {
      const s = new Date(now);
      s.setHours(0, 0, 0, 0);
      return { from: iso(s), to: iso(now) };
    }
    case '7d':
      return { from: iso(daysAgo(7)), to: iso(now) };
    case '90d':
      return { from: iso(daysAgo(90)), to: iso(now) };
    case 'mes':
      return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) };
    case 'tudo':
      return { from: iso(new Date(2020, 0, 1)), to: iso(now) };
    case 'custom':
      if (customFrom && customTo) {
        return {
          from: new Date(`${customFrom}T00:00:00`).toISOString(),
          to: new Date(`${customTo}T23:59:59`).toISOString(),
        };
      }
      return { from: iso(daysAgo(30)), to: iso(now) };
    case '30d':
    default:
      return { from: iso(daysAgo(30)), to: iso(now) };
  }
}

export function DashboardPeriodFilter({
  period,
  setPeriod,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
}: {
  period: DashPeriod;
  setPeriod: (p: DashPeriod) => void;
  customFrom: string;
  setCustomFrom: (v: string) => void;
  customTo: string;
  setCustomTo: (v: string) => void;
}) {
  const inputCls =
    'rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-white';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
        <CalendarDays className="h-4 w-4" /> Período
      </div>
      <div className="inline-flex flex-wrap gap-1 rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {PERIOD_PRESETS.map((p) => (
          <button
            key={p.v}
            type="button"
            onClick={() => setPeriod(p.v)}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              period === p.v
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {period === 'custom' && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className={inputCls}
          />
          <span className="text-xs text-zinc-400">até</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className={inputCls}
          />
        </div>
      )}
    </div>
  );
}
