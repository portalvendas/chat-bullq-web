'use client';

/**
 * Produtividade dos vendedores (OWNER/ADMIN), com o mesmo filtro de período
 * do Dashboard: início/fim do dia, tempo de tela no CRM, atendimento (CRM +
 * celular), funil, vendas do Tiny e rotina. Em 1 dia, o clique no vendedor
 * abre a linha do tempo; em períodos, abre o dia a dia.
 * Toda a agregação vem pronta do backend (/productivity/daily e /timeline).
 */
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Info,
  Loader2,
  ShieldAlert,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import {
  productivityService,
  type SellerDailyRow,
} from '@/features/productivity/services/productivity.service';
import {
  DashboardPeriodFilter,
  periodRange,
  type DashPeriod,
} from '@/features/dashboard/components/period-filter';
import {
  PRODUCTIVITY_TZ,
  STATE_CLS,
  brl,
  dur,
  hhmm,
  localMinutes,
  secs,
  todayLocal,
} from '@/features/productivity/lib/format';

const AREA_LABEL: Record<string, string> = {
  inbox: 'Conversas',
  pipelines: 'Funil',
  dashboard: 'Dashboard',
  rotina: 'Rotina',
  contacts: 'Contatos',
  tiny: 'Tiny',
  disparos: 'Disparos',
  settings: 'Configurações',
  outros: 'Outros',
};


const PERIOD_KEY = 'produtividade.period';

/** ISO → dia-calendário local (YYYY-MM-DD, fuso de SP). */
function isoToLocalDay(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: PRODUCTIVITY_TZ }).format(new Date(iso));
}

/** 'YYYY-MM-DD' → 'DD/MM'. */
function br(day: string): string {
  const [, m, d] = day.split('-');
  return `${d}/${m}`;
}

/** Minutos desde 00:00 → "08:12". */
function clock(min: number | null | undefined): string {
  if (min == null) return '—';
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

export default function ProdutividadePage() {
  const { organizations, activeOrgId } = useAuthStore();
  const role = organizations.find((o) => o.id === activeOrgId)?.role;
  const isAdmin = role === 'OWNER' || role === 'ADMIN';

  // Mesmo filtro do Dashboard; o período escolhido fica salvo neste painel.
  const [period, setPeriod] = useState<DashPeriod>(() => {
    if (typeof window === 'undefined') return 'hoje';
    return (window.localStorage.getItem(PERIOD_KEY) as DashPeriod) || 'hoje';
  });
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  useEffect(() => {
    try {
      window.localStorage.setItem(PERIOD_KEY, period);
    } catch {
      /* ignore */
    }
  }, [period]);
  const range = useMemo(() => {
    const r = periodRange(period, customFrom, customTo);
    return { from: isoToLocalDay(r.from), to: isoToLocalDay(r.to) };
  }, [period, customFrom, customTo]);

  const [showInactive, setShowInactive] = useState(false);
  const [openUser, setOpenUser] = useState<string | null>(null);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['productivity', 'daily', range.from, range.to],
    queryFn: () => productivityService.daily(range),
    enabled: isAdmin,
    staleTime: 30_000,
    refetchInterval: range.to === todayLocal() ? 60_000 : false,
  });

  const rows = useMemo(
    () => (data?.users ?? []).filter((u) => showInactive || u.hasActivity),
    [data, showInactive],
  );
  const hiddenCount = (data?.users.length ?? 0) - rows.length;
  const single = data?.singleDay ?? true;
  const cols = single ? 16 : 17;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <ShieldAlert className="mx-auto h-8 w-8 text-zinc-300" />
          <h1 className="mt-3 text-base font-semibold text-zinc-800 dark:text-zinc-100">Acesso restrito</h1>
          <p className="mt-1 text-sm text-zinc-500">
            O painel de produtividade está disponível apenas para administradores.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto h-full max-w-[1500px] space-y-5 overflow-y-auto p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="inline-flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          <Activity className="h-5 w-5 text-primary" /> Produtividade
        </h1>
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <DashboardPeriodFilter
          period={period}
          setPeriod={setPeriod}
          customFrom={customFrom}
          setCustomFrom={setCustomFrom}
          customTo={customTo}
          setCustomTo={setCustomTo}
        />
        {data && (
          <span className="text-xs text-zinc-400">
            {data.singleDay
              ? `Dia ${br(data.from)}`
              : `${br(data.from)} a ${br(data.to)} · ${data.calendarDays} dias`}
          </span>
        )}
      </div>

      {data?.clamped && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-400">
          Período limitado aos últimos 366 dias. O tempo de tela começou a ser medido em 19/10/2026.
        </div>
      )}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
          Não foi possível carregar: {(error as Error).message}
        </div>
      ) : isLoading || !data ? (
        <div className="flex items-center gap-2 p-6 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" /> carregando…
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Kpi label="Vendedores ativos" value={String(data.totals.activeSellers)} />
            <Kpi label="Em uso no CRM" value={dur(data.totals.activeMinutes)} />
            <Kpi label="Em atendimento" value={dur(data.totals.talkMinutes)} />
            <Kpi label="Mensagens enviadas" value={String(data.totals.messages)} sub={`${data.totals.conversations} conversas`} />
            <Kpi label="Orçamentos" value={String(data.totals.quotes)} sub={brl(data.totals.quotesValue)} />
            <Kpi label="Pedidos" value={String(data.totals.orders)} sub={brl(data.totals.ordersValue)} />
          </section>

          {data.unmappedSellers.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Vendedor(es) do Tiny sem usuário correspondente no CRM (casamos pelo primeiro nome):{' '}
                <b>{data.unmappedSellers.join(', ')}</b>. Os orçamentos/pedidos deles não entram na tabela.
              </span>
            </div>
          )}

          <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-400">
                    <th className="sticky left-0 bg-white px-4 py-2.5 font-medium dark:bg-zinc-900">Vendedor</th>
                    {!single && <Th title="Dias do período com atividade (CRM em uso ou mensagem)">Dias</Th>}
                    <Th title={single ? '1º minuto em uso no CRM ou 1ª mensagem (inclui celular)' : 'Média do início por dia trabalhado'}>
                      {single ? 'Início' : 'Início méd.'}
                    </Th>
                    <Th title={single ? 'Último sinal do dia: CRM em uso ou mensagem (inclui celular)' : 'Média do fim por dia trabalhado'}>
                      {single ? 'Fim' : 'Fim méd.'}
                    </Th>
                    <Th title="Aba do CRM visível e com interação (total do período)">Em uso</Th>
                    <Th title="Aba visível sem interação por mais de 3 min">Ocioso</Th>
                    <Th title="Maior intervalo entre dois minutos em uso num mesmo dia">Maior pausa</Th>
                    <Th title="Sessões de envio de mensagens (CRM + celular), mensagens a até 10 min uma da outra">Atendimento</Th>
                    <Th title="Mensagens enviadas pelo CRM / pelo celular do número do vendedor">Msgs</Th>
                    <Th title="Conversas com ao menos uma mensagem do vendedor">Conversas</Th>
                    <Th title="Mediana do tempo até a 1ª resposta quando o cliente escreve">Resposta</Th>
                    <Th title="Conversas do vendedor com o cliente esperando há mais de 15 min (agora). Só quando o período inclui hoje.">Esperando</Th>
                    <Th title="Cards movidos de etapa pelo vendedor">Cards</Th>
                    <Th title="Ganhos / perdidos (cards do vendedor)">G / P</Th>
                    <Th title="Orçamentos no Tiny">Orçam.</Th>
                    <Th title="Pedidos (venda efetiva) no Tiny">Pedidos</Th>
                    <Th title="Passos da Rotina Comercial marcados">Rotina</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={cols} className="px-4 py-8 text-center text-sm text-zinc-400">
                        Nenhuma atividade registrada no período.
                      </td>
                    </tr>
                  )}
                  {rows.map((u) => (
                    <Fragment key={u.userId}>
                      <SellerRow
                        u={u}
                        single={single}
                        isToday={data.isToday}
                        open={openUser === u.userId}
                        onToggle={() => setOpenUser(openUser === u.userId ? null : u.userId)}
                      />
                      {openUser === u.userId && (
                        <tr className="border-t border-zinc-100 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-950/40">
                          <td colSpan={cols} className="px-4 py-4">
                            {single ? <SellerDetail u={u} day={data.from} /> : <PerDayTable u={u} />}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {hiddenCount > 0 && (
              <div className="border-t border-zinc-100 px-4 py-2 text-xs text-zinc-400 dark:border-zinc-800">
                <button type="button" className="hover:text-zinc-600 dark:hover:text-zinc-300" onClick={() => setShowInactive(!showInactive)}>
                  {showInactive ? 'Ocultar' : 'Mostrar'} {hiddenCount} usuário(s) sem atividade
                </button>
              </div>
            )}
          </section>

          <Methodology />
        </>
      )}
    </div>
  );
}

/** Período com vários dias: uma linha por dia; clique abre a linha do tempo daquele dia. */
function PerDayTable({ u }: { u: SellerDailyRow }) {
  const [openDay, setOpenDay] = useState<string | null>(null);
  if (u.perDay.length === 0) {
    return <p className="text-xs text-zinc-400">Sem dias com atividade no período.</p>;
  }
  const td = 'whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300';
  const days = [...u.perDay].reverse();
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        Dia a dia · clique num dia para ver a linha do tempo
      </div>
      <table className="w-full max-w-4xl border-collapse text-xs">
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-zinc-400">
            <th className="px-3 py-1.5 text-left font-medium">Dia</th>
            <th className="px-3 py-1.5 text-right font-medium">Início</th>
            <th className="px-3 py-1.5 text-right font-medium">Fim</th>
            <th className="px-3 py-1.5 text-right font-medium">Em uso</th>
            <th className="px-3 py-1.5 text-right font-medium">Ocioso</th>
            <th className="px-3 py-1.5 text-right font-medium">Atendimento</th>
            <th className="px-3 py-1.5 text-right font-medium">Msgs CRM / cel.</th>
            <th className="px-3 py-1.5 text-right font-medium">Conversas</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <Fragment key={d.day}>
              <tr
                className="cursor-pointer border-t border-zinc-100 hover:bg-white dark:border-zinc-800 dark:hover:bg-zinc-900"
                onClick={() => setOpenDay(openDay === d.day ? null : d.day)}
              >
                <td className="px-3 py-1.5 font-medium text-zinc-700 dark:text-zinc-200">
                  {new Date(`${d.day}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' })}
                </td>
                <td className={td}>{clock(d.startMin)}</td>
                <td className={td}>{clock(d.endMin)}</td>
                <td className={`${td} font-semibold`}>{dur(d.activeMinutes)}</td>
                <td className={td}>{dur(d.idleMinutes)}</td>
                <td className={`${td} font-semibold`}>{dur(d.talkMinutes)}</td>
                <td className={td}>{d.messagesCrm} / {d.messagesPhone}</td>
                <td className={td}>{d.conversations || '—'}</td>
              </tr>
              {openDay === d.day && (
                <tr>
                  <td colSpan={8} className="px-3 py-3">
                    <SellerDetail u={u} day={d.day} hideAreas />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <th className="whitespace-nowrap px-3 py-2.5 text-right font-medium" title={title}>
      <span className="cursor-help border-b border-dotted border-zinc-300 dark:border-zinc-600">{children}</span>
    </th>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-[11px] uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{value}</div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

function SellerRow({
  u,
  single,
  isToday,
  open,
  onToggle,
}: {
  u: SellerDailyRow;
  single: boolean;
  isToday: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const td = 'whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300';
  const pending = u.service.pendingNow;
  const perDay = (min: number) => (u.days > 1 ? `${dur(Math.round(min / u.days))}/dia` : '');
  return (
    <tr
      className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40"
      onClick={onToggle}
    >
      <td className="sticky left-0 bg-inherit px-4 py-2.5">
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4 text-zinc-400" /> : <ChevronRight className="h-4 w-4 text-zinc-400" />}
          <span className="max-w-[11rem] truncate font-medium text-zinc-900 dark:text-zinc-100">{u.name}</span>
          {isToday && u.presence.lastSeen && Date.now() - new Date(u.presence.lastSeen).getTime() < 3 * 60_000 && (
            <span className="h-2 w-2 rounded-full bg-emerald-500" title="Com o CRM aberto agora" />
          )}
        </div>
      </td>
      {!single && <td className={td}>{u.days || '—'}</td>}
      <td className={td}>{single ? hhmm(u.dayStart) : clock(u.avgStartMin)}</td>
      <td className={td}>{single ? hhmm(u.dayEnd) : clock(u.avgEndMin)}</td>
      <td className={`${td} font-semibold text-zinc-900 dark:text-zinc-100`} title={perDay(u.presence.activeMinutes)}>
        {dur(u.presence.activeMinutes)}
      </td>
      <td className={td}>{dur(u.presence.idleMinutes)}</td>
      <td className={td}>{dur(u.presence.longestBreakMinutes)}</td>
      <td className={`${td} font-semibold text-zinc-900 dark:text-zinc-100`} title={perDay(u.service.talkMinutes)}>
        {dur(u.service.talkMinutes)}
        {!single && u.days > 1 && u.service.talkMinutes > 0 && (
          <div className="text-[10px] font-normal text-zinc-400">{perDay(u.service.talkMinutes)}</div>
        )}
      </td>
      <td className={td}>
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-0.5" title="Pelo CRM">
            <Monitor className="h-3 w-3 text-zinc-400" />
            {u.service.messagesCrm}
          </span>
          <span className="inline-flex items-center gap-0.5" title="Pelo celular">
            <Smartphone className="h-3 w-3 text-zinc-400" />
            {u.service.messagesPhone}
          </span>
        </span>
      </td>
      <td className={td}>{u.service.conversations || '—'}</td>
      <td className={td} title={u.service.responses ? `${u.service.respondedWithin15}/${u.service.responses} respondidas em até 15 min` : ''}>
        {secs(u.service.responseMedianSec)}
      </td>
      <td className={td}>
        {pending == null ? (
          <span className="text-zinc-300 dark:text-zinc-600" title="Só quando o período inclui hoje">·</span>
        ) : pending > 0 ? (
          <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">{pending}</span>
        ) : (
          '0'
        )}
      </td>
      <td className={td}>{u.funnel.cardsMoved || '—'}</td>
      <td className={td}>
        {u.funnel.won || u.funnel.lost ? `${u.funnel.won} / ${u.funnel.lost}` : '—'}
      </td>
      <td className={td} title={u.sales.quotes ? brl(u.sales.quotesValue) : ''}>{u.sales.quotes || '—'}</td>
      <td className={td} title={u.sales.orders ? brl(u.sales.ordersValue) : ''}>
        {u.sales.orders ? (
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">{u.sales.orders}</span>
        ) : (
          '—'
        )}
      </td>
      <td className={td}>{u.routine.active ? `${u.routine.checked}/${u.routine.total}` : '—'}</td>
    </tr>
  );
}

function SellerDetail({ u, day, hideAreas }: { u: SellerDailyRow; day: string; hideAreas?: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: ['productivity', 'timeline', u.userId, day],
    queryFn: () => productivityService.timeline(u.userId, day),
    staleTime: 30_000,
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" /> carregando linha do tempo…
      </div>
    );
  }

  // Janela padrão 07h–20h, ampliada se houve atividade fora dela.
  const marks = [
    ...data.segments.flatMap((s) => [localMinutes(s.start), localMinutes(s.end) || 24 * 60]),
    ...data.hourly.filter((h) => h.crm + h.phone > 0).flatMap((h) => [h.hour * 60, h.hour * 60 + 60]),
  ];
  const from = Math.min(7 * 60, ...marks.map((m) => Math.floor(m / 60) * 60));
  const to = Math.max(20 * 60, ...marks.map((m) => Math.ceil(m / 60) * 60));
  const span = Math.max(60, to - from);
  const pct = (m: number) => `${((m - from) / span) * 100}%`;
  const hours = Array.from({ length: span / 60 + 1 }, (_, i) => from / 60 + i);
  const maxMsgs = Math.max(1, ...data.hourly.map((h) => h.crm + h.phone));

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
          <span className="font-semibold uppercase tracking-wide text-zinc-400">Tempo de tela no CRM</span>
          <Legend cls={STATE_CLS.active} label="Em uso" />
          <Legend cls={STATE_CLS.idle} label="Aberto, sem interação" />
          <Legend cls={STATE_CLS.background} label="Em segundo plano" />
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900" /> CRM fechado</span>
        </div>
        <div className="relative h-6 overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
          {data.segments.map((s, i) => {
            const a = localMinutes(s.start);
            const b = localMinutes(s.end) || 24 * 60;
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
        <HourAxis hours={hours} pct={pct} />
      </div>

      <div>
        <div className="mb-1.5 flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
          <span className="font-semibold uppercase tracking-wide text-zinc-400">Mensagens enviadas por hora</span>
          <Legend cls="bg-sky-500" label="CRM" />
          <Legend cls="bg-violet-400" label="Celular" />
        </div>
        <div className="relative h-16 rounded-md border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
          {data.hourly
            .filter((h) => h.hour * 60 >= from && h.hour * 60 < to)
            .map((h) => {
              const total = h.crm + h.phone;
              if (!total) return null;
              const hTotal = (total / maxMsgs) * 100;
              return (
                <div
                  key={h.hour}
                  className="absolute bottom-0 flex flex-col justify-end"
                  style={{ left: pct(h.hour * 60 + 8), width: `${(44 / span) * 100}%`, height: `${hTotal}%` }}
                  title={`${String(h.hour).padStart(2, '0')}h: ${h.crm} pelo CRM, ${h.phone} pelo celular`}
                >
                  <div className="w-full rounded-t-sm bg-violet-400" style={{ height: `${(h.phone / total) * 100}%` }} />
                  <div className="w-full bg-sky-500" style={{ height: `${(h.crm / total) * 100}%` }} />
                </div>
              );
            })}
        </div>
        <HourAxis hours={hours} pct={pct} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {!hideAreas && (
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Onde o tempo em uso foi gasto</div>
          {u.presence.areas.length === 0 ? (
            <p className="text-xs text-zinc-400">Sem uso registrado.</p>
          ) : (
            <ul className="space-y-1">
              {u.presence.areas.map((a) => (
                <li key={a.area} className="flex items-center gap-2 text-xs">
                  <span className="w-28 truncate text-zinc-600 dark:text-zinc-300">{AREA_LABEL[a.area] ?? a.area}</span>
                  <span className="h-2 rounded-full bg-emerald-500/80" style={{ width: `${(a.minutes / Math.max(1, u.presence.activeMinutes)) * 60}%` }} />
                  <span className="tabular-nums text-zinc-500">{dur(a.minutes)}</span>
                </li>
              ))}
              <li className="pt-1 text-xs text-zinc-400">
                Com uma conversa aberta: {dur(u.presence.conversationMinutes)} · Em segundo plano: {dur(u.presence.backgroundMinutes)}
              </li>
            </ul>
          )}
        </div>
        )}
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Movimentos no funil</div>
          {data.cardEvents.length === 0 ? (
            <p className="text-xs text-zinc-400">Nenhum card movido.</p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto pr-1 text-xs">
              {data.cardEvents.map((e, i) => (
                <li key={i} className="flex gap-2 text-zinc-600 dark:text-zinc-300">
                  <span className="tabular-nums text-zinc-400">{hhmm(e.at)}</span>
                  <span className="min-w-0 flex-1 truncate">
                    <b className="font-medium">{e.cardTitle ?? 'Card'}</b> · {e.fromStage ?? '?'} → {e.toStage ?? '?'}
                    {e.type === 'WON' && <span className="ml-1 text-emerald-600">ganho</span>}
                    {e.type === 'LOST' && <span className="ml-1 text-red-500">perdido</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function HourAxis({ hours, pct }: { hours: number[]; pct: (m: number) => string }) {
  return (
    <div className="relative mt-0.5 h-4 text-[10px] tabular-nums text-zinc-400">
      {hours.map((h, i) =>
        i % 2 === 0 ? (
          <span key={h} className="absolute -translate-x-1/2" style={{ left: pct(h * 60) }}>
            {String(h).padStart(2, '0')}h
          </span>
        ) : null,
      )}
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-2.5 w-2.5 rounded-sm ${cls}`} /> {label}
    </span>
  );
}

function Methodology() {
  return (
    <details className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
      <summary className="inline-flex cursor-pointer items-center gap-1.5 font-medium text-zinc-600 dark:text-zinc-300">
        <Info className="h-3.5 w-3.5" /> Como os números são calculados
      </summary>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li><b>Tempo de tela</b> mede só o CRM: a aba envia um sinal a cada 30s. &quot;Em uso&quot; = aba visível com mouse/teclado nos últimos 3 min; &quot;ocioso&quot; = aba visível sem interação. Nada fora do CRM é observado.</li>
        <li><b>Atendimento</b> soma as sessões de envio de mensagens (mensagens a até 10 min uma da outra). Inclui o que o vendedor manda <b>pelo celular</b> no número dele (canal com &quot;dono do número&quot;), por isso cobre quem atende fora do CRM.</li>
        <li><b>Resposta</b> é a mediana do tempo entre o cliente escrever e a 1ª resposta humana (CRM ou celular). Mensagens automáticas não contam.</li>
        <li><b>Orçamentos e pedidos</b> vêm do Tiny pelo nome do vendedor. Pedidos contam só venda efetiva (sem marketplace e sem cancelados).</li>
        <li>Cards movidos são registrados a partir da ativação deste painel; dias anteriores não têm esse dado.</li>
      </ul>
    </details>
  );
}
