'use client';

/**
 * "Meu dia" — indicador INDIVIDUAL do usuário logado, no topo do Dashboard.
 * Mostra só os números de quem está vendo (nunca os da equipe). Atualiza a
 * cada minuto enquanto for hoje. Admin/dono ganha um atalho pro painel da
 * equipe (/produtividade).
 */
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowRight, Loader2, Monitor, Smartphone } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { productivityService } from '../services/productivity.service';
import { STATE_CLS, brl, dur, hhmm, localMinutes, secs, todayLocal } from '../lib/format';

function yesterdayLocal(): string {
  const [y, m, d] = todayLocal().split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1, 12)).toISOString().slice(0, 10);
}

export function MyDayCard() {
  const { organizations, activeOrgId } = useAuthStore();
  const role = organizations.find((o) => o.id === activeOrgId)?.role;
  const isAdmin = role === 'OWNER' || role === 'ADMIN';
  const [which, setWhich] = useState<'today' | 'yesterday'>('today');
  const day = which === 'today' ? todayLocal() : yesterdayLocal();

  const { data, isLoading, error } = useQuery({
    queryKey: ['productivity', 'me', activeOrgId, day],
    queryFn: () => productivityService.me(day),
    staleTime: 30_000,
    refetchInterval: which === 'today' ? 60_000 : false,
  });

  const header = (
    <div className="flex flex-wrap items-center gap-2">
      <Activity className="h-4 w-4 text-primary" />
      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Meu dia</span>
      <div className="ml-2 inline-flex rounded-lg border border-zinc-200 p-0.5 text-xs dark:border-zinc-700">
        {(['today', 'yesterday'] as const).map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setWhich(w)}
            className={`rounded-md px-2 py-0.5 ${which === w ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
          >
            {w === 'today' ? 'Hoje' : 'Ontem'}
          </button>
        ))}
      </div>
      {isAdmin && (
        <Link
          href="/produtividade"
          className="ml-auto inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Ver equipe <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );

  if (error) return null; // indicador é complementar: não polui o dashboard se falhar

  return (
    <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {header}
      {isLoading || !data ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" /> carregando…
        </div>
      ) : (
        <MyDayBody data={data} />
      )}
    </section>
  );
}

function MyDayBody({ data }: { data: Awaited<ReturnType<typeof productivityService.me>> }) {
  const u = data.me;
  const pending = u.service.pendingNow;
  const within =
    u.service.responses > 0 ? Math.round((u.service.respondedWithin15 / u.service.responses) * 100) : null;

  // Janela 07h–20h, ampliada se houve atividade fora dela.
  const marks = data.timeline.segments.flatMap((s) => [localMinutes(s.start), localMinutes(s.end) || 1440]);
  const from = Math.min(7 * 60, ...marks.map((m) => Math.floor(m / 60) * 60));
  const to = Math.max(20 * 60, ...marks.map((m) => Math.ceil(m / 60) * 60));
  const span = Math.max(60, to - from);
  const pct = (m: number) => `${((m - from) / span) * 100}%`;

  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 lg:grid-cols-8">
        <Stat label="Início" value={hhmm(u.dayStart)} />
        <Stat label="Em uso no CRM" value={dur(u.presence.activeMinutes)} hint={`Ocioso ${dur(u.presence.idleMinutes)}`} />
        <Stat label="Em atendimento" value={dur(u.service.talkMinutes)} hint={`${u.service.conversations} conversa(s)`} />
        <Stat
          label="Mensagens"
          value={String(u.service.messagesCrm + u.service.messagesPhone)}
          hint={
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-0.5"><Monitor className="h-3 w-3" />{u.service.messagesCrm}</span>
              <span className="inline-flex items-center gap-0.5"><Smartphone className="h-3 w-3" />{u.service.messagesPhone}</span>
            </span>
          }
        />
        <Stat
          label="Tempo de resposta"
          value={secs(u.service.responseMedianSec)}
          hint={within != null ? `${within}% em até 15 min` : undefined}
        />
        <Stat
          label="Esperando resposta"
          value={pending == null ? '—' : String(pending)}
          tone={pending ? 'bad' : undefined}
          hint={pending ? <Link href="/inbox" className="underline">abrir conversas</Link> : undefined}
        />
        <Stat
          label="Funil"
          value={String(u.funnel.cardsMoved)}
          hint={`movidos · ${u.funnel.won} ganho(s)`}
        />
        <Stat
          label="Orçam. / Pedidos"
          value={`${u.sales.quotes} / ${u.sales.orders}`}
          tone={u.sales.orders ? 'good' : undefined}
          hint={u.sales.ordersValue ? brl(u.sales.ordersValue) : u.sales.quotesValue ? brl(u.sales.quotesValue) : undefined}
        />
      </div>

      <div>
        <div className="relative h-3 overflow-hidden rounded-full border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950">
          {data.timeline.segments.map((s, i) => {
            const a = localMinutes(s.start);
            const b = localMinutes(s.end) || 1440;
            return (
              <div
                key={i}
                className={`absolute inset-y-0 ${STATE_CLS[s.state]}`}
                style={{ left: pct(a), width: `${(Math.max(1, b - a) / span) * 100}%` }}
                title={`${hhmm(s.start)}–${hhmm(s.end)}`}
              />
            );
          })}
        </div>
        <div className="mt-1 flex justify-between text-[10px] tabular-nums text-zinc-400">
          <span>{String(from / 60).padStart(2, '0')}h</span>
          <span className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1"><span className={`h-2 w-2 rounded-sm ${STATE_CLS.active}`} />em uso</span>
            <span className="inline-flex items-center gap-1"><span className={`h-2 w-2 rounded-sm ${STATE_CLS.idle}`} />sem interação</span>
            {u.routine.active && <span>Rotina {u.routine.checked}/{u.routine.total}</span>}
          </span>
          <span>{String(to / 60).padStart(2, '0')}h</span>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  tone?: 'good' | 'bad';
}) {
  const color =
    tone === 'bad'
      ? 'text-red-600 dark:text-red-400'
      : tone === 'good'
        ? 'text-emerald-700 dark:text-emerald-400'
        : 'text-zinc-900 dark:text-zinc-100';
  return (
    <div className="min-w-0">
      <div className="truncate text-[11px] uppercase tracking-wide text-zinc-400">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${color}`}>{value}</div>
      {hint && <div className="truncate text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}
