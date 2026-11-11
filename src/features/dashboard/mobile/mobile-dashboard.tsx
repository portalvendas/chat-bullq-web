'use client';

/**
 * Dashboard MOBILE — carregado automaticamente quando o CRM é aberto no
 * celular (viewport < 768px). Uma única chamada (GET /dashboard/mobile)
 * traz tudo agregado no servidor; a tela só formata.
 *
 * Abas: Resumo · Vendas · Vendedores · Atendimento. O período é o MESMO do
 * dashboard desktop (chave `dashboard.period` no localStorage).
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, Bot, CheckCircle2, Clock, FileText,
  Inbox, Minus, Monitor, RefreshCw, ShoppingCart, Star, Target, Trophy, Users, UserPlus,
} from 'lucide-react';
import { useOrgId } from '@/hooks/use-org-query-key';
import { dashboardService, type MobileDashboardData } from '../services/dashboard.service';
import { periodRange, type DashPeriod } from '../components/period-filter';

type Tab = 'resumo' | 'vendas' | 'vendedores' | 'atendimento';
type Metric = 'vendas' | 'pedidos' | 'propostas' | 'leads';

const PERIODS: Array<{ v: DashPeriod; label: string }> = [
  { v: 'hoje', label: 'Hoje' },
  { v: '7d', label: '7 dias' },
  { v: 'mes', label: 'Este mês' },
  { v: '30d', label: '30 dias' },
  { v: '90d', label: '90 dias' },
];
const MOBILE_PERIODS = new Set(PERIODS.map((p) => p.v));

// ── formatação ────────────────────────────────────────────────────────────
const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const brlCompact = (n: number) =>
  n >= 1000
    ? `R$ ${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: n >= 100_000 ? 0 : 1 })}k`
    : brl(n);
const int = (n: number) => n.toLocaleString('pt-BR');
const pct = (n: number | null | undefined) => (n == null ? '—' : `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);
const mins = (m: number | null | undefined) => {
  if (m == null) return '—';
  if (m < 60) return `${m}min`;
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
};
function bucketLabel(date: string, bucket: 'day' | 'week' | 'month') {
  const [y, m, d] = date.split('-');
  if (bucket === 'month') {
    const names = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return `${names[Number(m) - 1]}/${y.slice(2)}`;
  }
  return `${d}/${m}`;
}
function timeAgo(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  return `às ${new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

// ── peças visuais ─────────────────────────────────────────────────────────
function Delta({ value, inverse = false }: { value: number | null | undefined; inverse?: boolean }) {
  if (value == null) return null;
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-zinc-400">
        <Minus className="h-3 w-3" />0%
      </span>
    );
  }
  const good = inverse ? value < 0 : value > 0;
  const Icon = value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${good ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
    </span>
  );
}

function Kpi({
  label, value, sub, delta, inverse, icon: Icon, accent, onClick,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  delta?: number | null;
  inverse?: boolean;
  icon: React.ElementType;
  accent: string;
  onClick?: () => void;
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className="flex min-w-0 flex-col rounded-2xl border border-zinc-200 bg-white p-3.5 text-left shadow-sm active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}1a`, color: accent }}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <span className="mt-2 truncate text-[22px] font-bold leading-tight tabular-nums text-zinc-900 dark:text-zinc-50">{value}</span>
      <div className="mt-1 flex min-h-4 flex-wrap items-center gap-x-1.5 text-[11px] text-zinc-500">
        <Delta value={delta} inverse={inverse} />
        {sub}
      </div>
    </Comp>
  );
}

function Card({ title, icon: Icon, right, children }: { title: string; icon?: React.ElementType; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {Icon && <Icon className="h-4 w-4 text-zinc-400" />}
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function SectionError({ what }: { what: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      Não foi possível carregar {what} agora. Puxe para atualizar em instantes.
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[104px] animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
        ))}
      </div>
      <div className="h-56 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-40 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
    </div>
  );
}

const METRICS: Array<{ v: Metric; label: string; color: string; money?: boolean }> = [
  { v: 'vendas', label: 'Vendas R$', color: '#10b981', money: true },
  { v: 'pedidos', label: 'Pedidos', color: '#3b82f6' },
  { v: 'propostas', label: 'Propostas', color: '#f59e0b' },
  { v: 'leads', label: 'Leads', color: '#8b5cf6' },
];

function SeriesChart({ serie, metric, height = 'h-48' }: { serie: NonNullable<MobileDashboardData['serie']>; metric: Metric; height?: string }) {
  const m = METRICS.find((x) => x.v === metric)!;
  const data = serie.points.map((p) => ({ ...p, label: bucketLabel(p.date, serie.bucket) }));
  if (data.length === 0) {
    return <p className="py-10 text-center text-xs text-zinc-400">Sem dados no período</p>;
  }
  return (
    <div className={height}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} />
          <YAxis
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={44}
            allowDecimals={false}
            tickFormatter={(v: number) => (m.money ? (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)) : String(v))}
          />
          <Tooltip
            cursor={{ fill: 'rgba(161,161,170,0.15)' }}
            contentStyle={{ background: 'rgba(24,24,27,0.92)', border: 'none', borderRadius: 8, fontSize: 12, color: '#fff' }}
            formatter={(v) => [m.money ? brl(Number(v)) : int(Number(v)), m.label]}
          />
          <Bar dataKey={metric} fill={m.color} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MetricChips({ metric, setMetric }: { metric: Metric; setMetric: (m: Metric) => void }) {
  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
      {METRICS.map((m) => (
        <button
          key={m.v}
          type="button"
          onClick={() => setMetric(m.v)}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            metric === m.v ? 'text-white' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
          }`}
          style={metric === m.v ? { backgroundColor: m.color } : undefined}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

function Funnel({ leads, propostas, pedidos }: { leads: number; propostas: number; pedidos: number }) {
  const max = Math.max(leads, propostas, pedidos, 1);
  const rows = [
    { label: 'Leads', value: leads, color: '#8b5cf6' },
    { label: 'Propostas', value: propostas, color: '#f59e0b', rate: leads ? (propostas / leads) * 100 : null },
    { label: 'Pedidos', value: pedidos, color: '#10b981', rate: propostas ? (pedidos / propostas) * 100 : null },
  ];
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="font-medium text-zinc-600 dark:text-zinc-300">{r.label}</span>
            <span className="tabular-nums text-zinc-900 dark:text-zinc-100">
              <b>{int(r.value)}</b>
              {r.rate != null && <span className="ml-1.5 text-[11px] text-zinc-400">{pct(Math.round(r.rate * 10) / 10)}</span>}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, backgroundColor: r.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Initials({ name }: { name: string }) {
  const ini = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {ini || '?'}
    </span>
  );
}

function titleCase(s: string) {
  return s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

// ── abas ──────────────────────────────────────────────────────────────────
function ResumoTab({ d, go }: { d: MobileDashboardData; go: (t: Tab) => void }) {
  const [metric, setMetric] = useState<Metric>('vendas');
  return (
    <div className="space-y-3">
      {d.vendas && d.propostas && d.leads ? (
        <div className="grid grid-cols-2 gap-3">
          <Kpi label="Vendas" value={brlCompact(d.vendas.valor)} delta={d.vendas.deltaValorPct} icon={ShoppingCart} accent="#10b981"
            sub={<span>{int(d.vendas.pedidos)} pedidos</span>} onClick={() => go('vendas')} />
          <Kpi label="Ticket médio" value={brlCompact(d.vendas.ticketMedio)} icon={Target} accent="#0ea5e9"
            sub={<span>por pedido</span>} />
          <Kpi label="Propostas" value={int(d.propostas.count)} delta={d.propostas.deltaCountPct} icon={FileText} accent="#f59e0b"
            sub={<span>{brlCompact(d.propostas.valor)}</span>} />
          <Kpi label="Leads" value={int(d.leads.count)} delta={d.leads.deltaPct} icon={UserPlus} accent="#8b5cf6"
            sub={d.leads.perDay != null ? <span>{d.leads.perDay.toLocaleString('pt-BR')}/dia</span> : undefined} />
        </div>
      ) : (
        <SectionError what="os números comerciais" />
      )}

      {(d.leads?.noResponse ?? 0) > 0 || (d.atendimento?.presas ?? 0) > 0 || (d.atendimento?.fila ?? 0) > 0 ? (
        <div className="space-y-2">
          {(d.leads?.noResponse ?? 0) > 0 && (
            <Link href="/inbox" className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/30">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
              <span className="flex-1 text-sm text-red-800 dark:text-red-300">
                <b>{int(d.leads!.noResponse)}</b> lead{d.leads!.noResponse === 1 ? '' : 's'} sem resposta
              </span>
              <span className="text-xs font-medium text-red-600 dark:text-red-400">Abrir</span>
            </Link>
          )}
          {(d.atendimento?.presas ?? 0) > 0 && (
            <Link href="/inbox?stuck=true" className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
              <Clock className="h-5 w-5 shrink-0 text-amber-500" />
              <span className="flex-1 text-sm text-amber-800 dark:text-amber-300">
                <b>{int(d.atendimento!.presas)}</b> conversa{d.atendimento!.presas === 1 ? '' : 's'} presa{d.atendimento!.presas === 1 ? '' : 's'}
              </span>
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Abrir</span>
            </Link>
          )}
          {(d.atendimento?.fila ?? 0) > 0 && (
            <Link href="/inbox" className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900/50 dark:bg-blue-950/30">
              <Inbox className="h-5 w-5 shrink-0 text-blue-500" />
              <span className="flex-1 text-sm text-blue-800 dark:text-blue-300">
                <b>{int(d.atendimento!.fila)}</b> na fila aguardando atendimento
              </span>
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Abrir</span>
            </Link>
          )}
        </div>
      ) : null}

      {d.serie ? (
        <Card title="Por período" right={<span className="text-[11px] text-zinc-400">{d.serie.bucket === 'day' ? 'por dia' : d.serie.bucket === 'week' ? 'por semana' : 'por mês'}</span>}>
          <MetricChips metric={metric} setMetric={setMetric} />
          <div className="mt-2">
            <SeriesChart serie={d.serie} metric={metric} />
          </div>
        </Card>
      ) : (
        <SectionError what="o gráfico do período" />
      )}

      {d.vendas && d.propostas && d.leads && (
        <Card title="Funil do período" icon={Target}
          right={<span className="text-[11px] text-zinc-400">lead→pedido {pct(d.leads.conversaoPct)}</span>}>
          <Funnel leads={d.leads.count} propostas={d.propostas.count} pedidos={d.vendas.pedidos} />
        </Card>
      )}

      {d.vendedores && d.vendedores.length > 0 && (
        <Card title="Top vendedores" icon={Trophy}
          right={<button type="button" onClick={() => go('vendedores')} className="text-xs font-medium text-primary">Ver todos</button>}>
          <SellerList rows={d.vendedores.slice(0, 3)} compact />
        </Card>
      )}
    </div>
  );
}

function VendasTab({ d }: { d: MobileDashboardData }) {
  const [metric, setMetric] = useState<Metric>('vendas');
  if (!d.serie || !d.vendas) return <SectionError what="as vendas" />;
  const rows = [...d.serie.points].reverse().filter((p) => p.pedidos || p.propostas || p.leads);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Kpi label="Faturado" value={brlCompact(d.vendas.valor)} delta={d.vendas.deltaValorPct} icon={ShoppingCart} accent="#10b981" />
        <Kpi label="Pedidos" value={int(d.vendas.pedidos)} delta={d.vendas.deltaPedidosPct} icon={CheckCircle2} accent="#3b82f6"
          sub={<span>ticket {brlCompact(d.vendas.ticketMedio)}</span>} />
        {d.propostas && (
          <Kpi label="Propostas" value={int(d.propostas.count)} delta={d.propostas.deltaCountPct} icon={FileText} accent="#f59e0b"
            sub={<span>{brlCompact(d.propostas.valor)}</span>} />
        )}
        {d.propostas && (
          <Kpi label="Proposta→pedido" value={pct(d.propostas.conversaoPct)} icon={Target} accent="#0ea5e9" sub={<span>conversão</span>} />
        )}
      </div>

      <Card title="Evolução">
        <MetricChips metric={metric} setMetric={setMetric} />
        <div className="mt-2">
          <SeriesChart serie={d.serie} metric={metric} height="h-56" />
        </div>
      </Card>

      <Card title={d.serie.bucket === 'day' ? 'Dia a dia' : d.serie.bucket === 'week' ? 'Semana a semana' : 'Mês a mês'}>
        {rows.length === 0 ? (
          <p className="py-4 text-center text-xs text-zinc-400">Sem movimento no período</p>
        ) : (
          <div className="-mx-4 divide-y divide-zinc-100 dark:divide-zinc-800">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 pb-2 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
              <span>Data</span><span className="w-12 text-right">Leads</span><span className="w-12 text-right">Prop.</span><span className="w-24 text-right">Vendas</span>
            </div>
            {rows.map((p) => (
              <div key={p.date} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-2.5 text-sm tabular-nums">
                <span className="font-medium text-zinc-700 dark:text-zinc-200">{bucketLabel(p.date, d.serie!.bucket)}</span>
                <span className="w-12 text-right text-zinc-500">{int(p.leads)}</span>
                <span className="w-12 text-right text-zinc-500">{int(p.propostas)}</span>
                <span className="w-24 text-right">
                  <span className="block font-semibold text-zinc-900 dark:text-zinc-100">{brlCompact(p.vendas)}</span>
                  <span className="block text-[10px] text-zinc-400">{int(p.pedidos)} ped.</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function SellerList({ rows, compact = false }: { rows: NonNullable<MobileDashboardData['vendedores']>; compact?: boolean }) {
  const max = Math.max(...rows.map((r) => r.vendas), 1);
  return (
    <ul className="space-y-3">
      {rows.map((v, i) => (
        <li key={v.vendedor} className="flex items-start gap-3">
          <div className="relative">
            <Initials name={v.vendedor} />
            {i < 3 && v.vendas > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-white">{i + 1}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">{titleCase(v.vendedor)}</span>
              <span className="shrink-0 text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{brlCompact(v.vendas)}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(v.vendas / max) * 100}%` }} />
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] tabular-nums text-zinc-500">
              <span>{int(v.pedidos)} pedidos</span>
              <span>{int(v.propostas)} propostas</span>
              {!compact && <span>{brlCompact(v.propostasValor)} orçado</span>}
              <span>{int(v.leads)} leads</span>
              {v.conversaoPct != null && <span className="font-medium text-zinc-700 dark:text-zinc-300">conv. {pct(v.conversaoPct)}</span>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function VendedoresTab({ d }: { d: MobileDashboardData }) {
  if (!d.vendedores) return <SectionError what="o ranking de vendedores" />;
  if (d.vendedores.length === 0) {
    return <p className="py-10 text-center text-sm text-zinc-400">Nenhum vendedor com movimento no período</p>;
  }
  return (
    <Card title="Ranking por vendas" icon={Trophy} right={<span className="text-[11px] text-zinc-400">conv. = pedidos ÷ leads</span>}>
      <SellerList rows={d.vendedores} />
    </Card>
  );
}

function AtendimentoTab({ d }: { d: MobileDashboardData }) {
  const a = d.atendimento;
  return (
    <div className="space-y-3">
      {a ? (
        <>
          <Card title="Agora" icon={Inbox}>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{int(a.ativas)}</span>
              <span className="pb-1 text-xs text-zinc-500">conversas ativas</span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              {[
                { l: 'Fila', v: a.fila, c: 'text-blue-600 dark:text-blue-400' },
                { l: 'Abertas', v: a.abertas, c: 'text-emerald-600 dark:text-emerald-400' },
                { l: 'Aguard.', v: a.aguardando, c: 'text-amber-600 dark:text-amber-400' },
                { l: 'Robô', v: a.bot, c: 'text-violet-600 dark:text-violet-400' },
              ].map((x) => (
                <div key={x.l} className="rounded-xl bg-zinc-50 py-2 dark:bg-zinc-800/60">
                  <p className={`text-lg font-bold tabular-nums ${x.c}`}>{int(x.v)}</p>
                  <p className="text-[10px] text-zinc-500">{x.l}</p>
                </div>
              ))}
            </div>
            {a.presas > 0 && (
              <Link href="/inbox?stuck=true" className="mt-3 flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" /> {int(a.presas)} presa{a.presas === 1 ? '' : 's'} — ver no inbox
              </Link>
            )}
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <Kpi label="1ª resposta" value={mins(a.primeiraRespostaMin)} delta={a.primeiraRespostaTrend} inverse icon={Clock} accent="#f59e0b"
              sub={<span>mediana</span>} />
            <Kpi label="SLA" value={pct(a.slaPct)} icon={Target} accent="#10b981" sub={<span>no prazo</span>} />
            <Kpi label="Resolução" value={pct(a.resolucaoPct)} icon={CheckCircle2} accent="#8b5cf6" sub={<span>fechadas/abertas</span>} />
            <Kpi label="CSAT" value={a.csat != null ? `${a.csat}/5` : '—'} icon={Star} accent="#eab308"
              sub={<span>{int(a.csatRespostas)} avaliações</span>} />
            <Kpi label="Conversas" value={int(a.conversas)} delta={a.conversasTrend} icon={Users} accent="#3b82f6" sub={<span>no período</span>} />
            <Kpi label="Mensagens" value={int(a.mensagens)} icon={Bot} accent="#06b6d4" sub={<span>no período</span>} />
          </div>
        </>
      ) : (
        <SectionError what="as métricas de atendimento" />
      )}

      {d.atendentes ? (
        <Card title="Por atendente" icon={Users}>
          {d.atendentes.length === 0 ? (
            <p className="py-4 text-center text-xs text-zinc-400">Nenhuma conversa atribuída no período</p>
          ) : (
            <ul className="-mx-4 divide-y divide-zinc-100 dark:divide-zinc-800">
              {d.atendentes.map((u) => (
                <li key={u.id} className="flex items-center gap-3 px-4 py-2.5">
                  {u.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                  ) : (
                    <Initials name={u.nome} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">{u.nome}</p>
                    <p className="text-[11px] tabular-nums text-zinc-500">
                      {int(u.conversas)} conv. · {pct(u.resolucaoPct)} resolvidas · 1ª resp. {mins(u.primeiraRespostaMin)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{int(u.ativas)}</p>
                    <p className="text-[10px] text-zinc-400">ativas</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <SectionError what="os atendentes" />
      )}
    </div>
  );
}

// ── página ────────────────────────────────────────────────────────────────
const TABS: Array<{ v: Tab; label: string }> = [
  { v: 'resumo', label: 'Resumo' },
  { v: 'vendas', label: 'Vendas' },
  { v: 'vendedores', label: 'Vendedores' },
  { v: 'atendimento', label: 'Atendimento' },
];

export function MobileDashboard({ onSwitchToDesktop }: { onSwitchToDesktop: () => void }) {
  const orgId = useOrgId();
  const [tab, setTab] = useState<Tab>('resumo');
  const [period, setPeriod] = useState<DashPeriod>(() => {
    if (typeof window === 'undefined') return 'hoje';
    const saved = window.localStorage.getItem('dashboard.period') as DashPeriod | null;
    return saved && MOBILE_PERIODS.has(saved) ? saved : 'hoje';
  });
  useEffect(() => {
    try {
      window.localStorage.setItem('dashboard.period', period);
    } catch {
      /* ignore */
    }
  }, [period]);

  // A janela é recalculada a CADA busca (to = agora), inclusive no refetch
  // automático de 2 min — o servidor arredonda pro minuto e cacheia 45s.
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['dashboard-mobile', orgId, period],
    queryFn: () => {
      const { from, to } = periodRange(period);
      return dashboardService.getMobile(from, to);
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
    placeholderData: (prev) => prev,
  });

  const refresh = () => {
    void refetch();
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-10 border-b border-zinc-200/70 bg-zinc-50/90 px-4 pb-2 pt-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Dashboard</h1>
            <p className="text-[11px] text-zinc-500">
              {data ? `Atualizado ${timeAgo(data.generatedAt)}` : 'Carregando…'}
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            aria-label="Atualizar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-600 shadow-sm ring-1 ring-zinc-200 active:scale-95 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-800"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="-mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]">
          {PERIODS.map((p) => (
            <button
              key={p.v}
              type="button"
              onClick={() => setPeriod(p.v)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                period === p.v
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-white text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <nav className="mt-2 grid grid-cols-4 gap-1 rounded-xl bg-zinc-200/60 p-1 dark:bg-zinc-800/70">
          {TABS.map((t) => (
            <button
              key={t.v}
              type="button"
              onClick={() => setTab(t.v)}
              className={`rounded-lg py-1.5 text-[12px] font-medium transition-colors ${
                tab === t.v
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50'
                  : 'text-zinc-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="px-4 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-3">
        {isLoading && !data ? (
          <Skeleton />
        ) : error && !data ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            Não foi possível carregar o dashboard.
            <button type="button" onClick={refresh} className="ml-2 font-semibold underline">Tentar de novo</button>
          </div>
        ) : data ? (
          <>
            {tab === 'resumo' && <ResumoTab d={data} go={setTab} />}
            {tab === 'vendas' && <VendasTab d={data} />}
            {tab === 'vendedores' && <VendedoresTab d={data} />}
            {tab === 'atendimento' && <AtendimentoTab d={data} />}
          </>
        ) : null}

        <button
          type="button"
          onClick={onSwitchToDesktop}
          className="mx-auto mt-6 flex items-center gap-1.5 text-xs font-medium text-zinc-500"
        >
          <Monitor className="h-3.5 w-3.5" /> Abrir versão completa
        </button>
      </main>
    </div>
  );
}
