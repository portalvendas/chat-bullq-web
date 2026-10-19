/** Formatação compartilhada do painel de produtividade (gestor e "Meu dia"). */

export const PRODUCTIVITY_TZ = 'America/Sao_Paulo';

export function todayLocal(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: PRODUCTIVITY_TZ }).format(new Date());
}

/** 125 → "2h05"; 40 → "40min"; 0 → "—". */
export function dur(min: number | null | undefined): string {
  if (!min) return '—';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${String(m).padStart(2, '0')}`;
}

export function hhmm(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('pt-BR', {
    timeZone: PRODUCTIVITY_TZ,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Minutos desde 00:00 local. */
export function localMinutes(iso: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PRODUCTIVITY_TZ,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(iso));
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return h * 60 + m;
}

/** Segundos → "45s" / "3min" / "1h10". */
export function secs(s: number | null | undefined): string {
  if (s == null) return '—';
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m}min` : dur(m);
}

export const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export const STATE_CLS: Record<string, string> = {
  active: 'bg-emerald-500',
  idle: 'bg-amber-300 dark:bg-amber-500/70',
  background: 'bg-zinc-300 dark:bg-zinc-600',
};
