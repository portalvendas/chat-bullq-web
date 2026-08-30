'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Users, Target, FileText, ShoppingBag, TrendingUp, DollarSign,
  Flame, Thermometer, Snowflake, HelpCircle, Megaphone, MapPin, Info, CalendarDays,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  dashboardService,
  type CommercialData,
  type IntakeHealth,
  type MetaAdsStatus,
} from '@/features/dashboard/services/dashboard.service';
import { useOrgId } from '@/hooks/use-org-query-key';

const brl = (n: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(n || 0);

const pct = (n: number) => `${(n ?? 0).toLocaleString('pt-BR')}%`;

function Kpi({
  label, value, sub, icon: Icon, accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}1a`, color: accent }}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <span className="mt-2 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{value}</span>
      {sub && <span className="mt-0.5 text-[11px] text-zinc-500">{sub}</span>}
    </div>
  );
}

function SectionCard({
  title, icon: Icon, subtitle, children,
}: {
  title: string;
  icon?: React.ElementType;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="h-4 w-4 text-zinc-400" />}
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{title}</h3>
      </div>
      {subtitle && <p className="mt-0.5 text-[11px] text-zinc-400">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

/** Barra horizontal simples (largura proporcional ao máximo). */
function Bar({ label, value, max, color, right }: {
  label: string; value: number; max: number; color: string; right?: string;
}) {
  const w = max > 0 ? Math.max((value / max) * 100, value > 0 ? 3 : 0) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="truncate text-zinc-600 dark:text-zinc-300">{label}</span>
        <span className="tabular-nums font-medium text-zinc-800 dark:text-zinc-200">{right ?? value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className="h-full rounded-full" style={{ width: `${w}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function Phase2Badge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
      <Info className="h-3 w-3" /> Fase 2 · Meta Ads
    </span>
  );
}

type Period = 7 | 30 | 90 | 'custom';

export function CommercialSection() {
  const orgId = useOrgId();
  const [period, setPeriod] = useState<Period>(30);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [origem, setOrigem] = useState('all');
  const [hideNoCampaign, setHideNoCampaign] = useState(false);

  const { from, to } = useMemo(() => {
    if (period === 'custom' && customFrom && customTo) {
      return {
        from: new Date(`${customFrom}T00:00:00`).toISOString(),
        to: new Date(`${customTo}T23:59:59`).toISOString(),
      };
    }
    const n = typeof period === 'number' ? period : 30;
    const toD = new Date();
    const fromD = new Date(toD.getTime() - n * 86400000);
    return { from: fromD.toISOString(), to: toD.toISOString() };
  }, [period, customFrom, customTo]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-commercial', orgId, from, to, origem],
    queryFn: () => dashboardService.getCommercial(from, to, origem),
    placeholderData: (prev) => prev,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900" />
        ))}
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
        Não foi possível carregar o painel comercial.
      </div>
    );
  }

  const d: CommercialData = data;
  const o = d.overview;
  const q = d.quality;
  const tempMax = Math.max(q.temperatura.quente, q.temperatura.morno, q.temperatura.frio, q.temperatura.semScore, 1);
  const originMax = Math.max(...d.byOrigin.map((r) => r.leads), 1);

  return (
    <div className="space-y-6">
      <PeriodFilter
        period={period}
        setPeriod={setPeriod}
        customFrom={customFrom}
        setCustomFrom={setCustomFrom}
        customTo={customTo}
        setCustomTo={setCustomTo}
      />

      <OrigemFilter origins={d.origins} value={origem} onChange={setOrigem} />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Kpi label="Leads" value={o.leads} sub={`${o.qualificados} qualificados (${pct(o.qualificadosPct)})`} icon={Users} accent="#3b82f6" />
        <Kpi label="Orçamentos" value={o.orcamentos} sub={brl(o.orcamentosValor)} icon={FileText} accent="#8b5cf6" />
        <Kpi label="Pedidos" value={o.pedidos} sub={brl(o.pedidosValor)} icon={ShoppingBag} accent="#10b981" />
        <Kpi label="Conversão lead→pedido" value={pct(d.funnel.leadParaPedidoPct)} sub={`${o.ganhos} ganhos · ${o.perdidos} perdidos`} icon={TrendingUp} accent="#f59e0b" />
        <Kpi label="Ticket médio" value={brl(o.ticketMedio)} sub="por pedido" icon={DollarSign} accent="#06b6d4" />
      </div>

      <MetaAdsPanel overview={d.overview} />

      <EvolutionCharts series={d.series} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Funil de conversão */}
        <SectionCard title="Funil de conversão" icon={Target} subtitle="Leads → Orçamentos → Pedidos (período)">
          <div className="space-y-4">
            <Bar label="Leads" value={d.funnel.leads} max={d.funnel.leads || 1} color="#3b82f6" />
            <Bar label={`Orçamentos · ${pct(d.funnel.leadParaOrcamentoPct)} dos leads`} value={d.funnel.orcamentos} max={d.funnel.leads || 1} color="#8b5cf6" />
            <Bar label={`Pedidos · ${pct(d.funnel.orcamentoParaPedidoPct)} dos orçamentos`} value={d.funnel.pedidos} max={d.funnel.leads || 1} color="#10b981" />
          </div>
        </SectionCard>

        {/* Qualidade */}
        <SectionCard title="Qualidade dos leads" icon={Target} subtitle="Temperatura na captação + avanço no funil + resultado">
          <div className="grid grid-cols-2 gap-3">
            <QualityTile icon={Flame} color="#ef4444" label="Quente (70+)" value={q.temperatura.quente} max={tempMax} />
            <QualityTile icon={Thermometer} color="#f59e0b" label="Morno (40-69)" value={q.temperatura.morno} max={tempMax} />
            <QualityTile icon={Snowflake} color="#3b82f6" label="Frio (<40)" value={q.temperatura.frio} max={tempMax} />
            <QualityTile icon={HelpCircle} color="#a1a1aa" label="Sem score" value={q.temperatura.semScore} max={tempMax} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <MiniStat label="Avançaram no funil" value={q.avancaram} />
            <MiniStat label="Geraram orç./pedido" value={q.comOrcamentoOuPedido} />
            <MiniStat label="Ganhos" value={q.ganhos} />
          </div>
        </SectionCard>
      </div>

      {/* Por Origem */}
      <SectionCard title="Leads por origem" icon={MapPin} subtitle="De onde vieram os leads e quanto converteram">
        <div className="space-y-3">
          {d.byOrigin.length === 0 && <Empty />}
          {d.byOrigin.map((r) => (
            <div key={r.origem} className="grid grid-cols-12 items-center gap-2">
              <div className="col-span-5">
                <Bar label={r.origem} value={r.leads} max={originMax} color="#3b82f6" />
              </div>
              <div className="col-span-7 grid grid-cols-4 gap-1 text-center text-[11px]">
                <Cell label="orç." value={r.orcamentos} />
                <Cell label="ped." value={r.pedidos} />
                <Cell label="conv." value={pct(r.conversaoPct)} />
                <Cell label="ganho" value={brl(r.valorGanho)} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Por Campanha */}
      <SectionCard title="Leads por campanha" icon={Megaphone} subtitle="Atribuição por utm_campaign / Meta Lead Ads">
        <CampaignFilter hideNoCampaign={hideNoCampaign} setHideNoCampaign={setHideNoCampaign} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-[11px] uppercase tracking-wide text-zinc-400 dark:border-zinc-800">
                <th className="py-2 pr-2 font-medium">Campanha</th>
                <th className="px-2 py-2 text-right font-medium">Leads</th>
                <th className="px-2 py-2 text-right font-medium">Orç.</th>
                <th className="px-2 py-2 text-right font-medium">Pedidos</th>
                <th className="px-2 py-2 text-right font-medium">Conv.</th>
                <th className="px-2 py-2 text-right font-medium">Valor ganho</th>
                <th className="px-2 py-2 text-right font-medium">
                  <span className="inline-flex items-center gap-1">Gasto <Phase2Badge /></span>
                </th>
                <th className="px-2 py-2 text-right font-medium">CAC</th>
                <th className="pl-2 py-2 text-right font-medium">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {d.byCampaign.length === 0 && (
                <tr><td colSpan={9} className="py-4 text-center text-zinc-400">Sem campanhas no período.</td></tr>
              )}
              {d.byCampaign
                .filter((r) => !hideNoCampaign || r.campanha !== '(sem campanha)')
                .map((r) => (
                <tr key={r.campanha} className="border-b border-zinc-50 last:border-0 dark:border-zinc-800/50">
                  <td className="py-2 pr-2 text-zinc-800 dark:text-zinc-200">{r.campanha}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.leads}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.orcamentos}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.pedidos}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{pct(r.conversaoPct)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{brl(r.valorGanho)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.gasto != null ? brl(r.gasto) : '—'}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.cac != null ? brl(r.cac) : '—'}</td>
                  <td className="pl-2 py-2 text-right tabular-nums">{r.roas != null ? `${r.roas}x` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-zinc-400">
          Gasto, CAC e ROAS são preenchidos quando a integração Meta Ads está conectada (painel acima).
        </p>
      </SectionCard>

      {/* Gasto por campanha (fonte de verdade: Meta) */}
      <SectionCard
        title="Gasto por campanha (Meta)"
        icon={DollarSign}
        subtitle="Valor investido por campanha no período, direto da Meta"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-[11px] uppercase tracking-wide text-zinc-400 dark:border-zinc-800">
                <th className="py-2 pr-2 font-medium">Campanha</th>
                <th className="px-2 py-2 text-right font-medium">Gasto</th>
                <th className="px-2 py-2 text-right font-medium">Leads</th>
                <th className="px-2 py-2 text-right font-medium">Pedidos</th>
                <th className="px-2 py-2 text-right font-medium">Valor ganho</th>
                <th className="px-2 py-2 text-right font-medium">CAC</th>
                <th className="pl-2 py-2 text-right font-medium">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {d.spendByCampaign.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-zinc-400">
                    {d.overview.gasto != null
                      ? 'Sem gasto por campanha no período.'
                      : 'Conecte a Meta Ads no painel acima para ver o gasto por campanha.'}
                  </td>
                </tr>
              )}
              {d.spendByCampaign.map((r) => (
                <tr key={r.campanha} className="border-b border-zinc-50 last:border-0 dark:border-zinc-800/50">
                  <td className="py-2 pr-2 text-zinc-800 dark:text-zinc-200">{r.campanha}</td>
                  <td className="px-2 py-2 text-right tabular-nums font-medium text-zinc-900 dark:text-zinc-100">{brl(r.gasto)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.leads}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.pedidos}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{brl(r.valorGanho)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.cac != null ? brl(r.cac) : '—'}</td>
                  <td className="pl-2 py-2 text-right tabular-nums">{r.roas != null ? `${r.roas}x` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-zinc-400">
          O gasto vem direto da Meta, por campanha. Leads/pedidos/CAC/ROAS aparecem quando o utm_campaign do lead casa com o nome da campanha na Meta.
        </p>
      </SectionCard>

      <IntakeHealthPanel />
    </div>
  );
}

function QualityTile({ icon: Icon, color, label, value, max }: {
  icon: React.ElementType; color: string; label: string; value: number; max: number;
}) {
  const w = max > 0 ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0;
  return (
    <div className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
        <Icon className="h-3.5 w-3.5" style={{ color }} /> {label}
      </div>
      <div className="mt-1 text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{value}</div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className="h-full rounded-full" style={{ width: `${w}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{value}</div>
      <div className="text-[10px] text-zinc-500">{label}</div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-zinc-50 py-1 dark:bg-zinc-800/50">
      <div className="tabular-nums font-medium text-zinc-800 dark:text-zinc-200">{value}</div>
      <div className="text-[9px] uppercase text-zinc-400">{label}</div>
    </div>
  );
}

function Empty() {
  return <p className="py-4 text-center text-sm text-zinc-400">Sem leads no período.</p>;
}

function PeriodFilter({
  period, setPeriod, customFrom, setCustomFrom, customTo, setCustomTo,
}: {
  period: 7 | 30 | 90 | 'custom';
  setPeriod: (p: 7 | 30 | 90 | 'custom') => void;
  customFrom: string;
  setCustomFrom: (v: string) => void;
  customTo: string;
  setCustomTo: (v: string) => void;
}) {
  const presets: Array<{ v: 7 | 30 | 90 | 'custom'; label: string }> = [
    { v: 7, label: '7 dias' },
    { v: 30, label: '30 dias' },
    { v: 90, label: '90 dias' },
    { v: 'custom', label: 'Personalizado' },
  ];
  const inputCls =
    'rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-white';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
        <CalendarDays className="h-4 w-4" /> Período
      </div>
      <div className="inline-flex gap-1 rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {presets.map((p) => (
          <button
            key={String(p.v)}
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

function OrigemFilter({
  origins, value, onChange,
}: {
  origins: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-medium transition-colors ${
      active
        ? 'bg-blue-600 text-white'
        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
    }`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
        <MapPin className="h-4 w-4" /> Origem
      </div>
      <button type="button" onClick={() => onChange('all')} className={chip(value === 'all')}>
        Todas
      </button>
      {origins.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)} className={chip(value === o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

function CampaignFilter({
  hideNoCampaign, setHideNoCampaign,
}: {
  hideNoCampaign: boolean;
  setHideNoCampaign: (v: boolean) => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
        Com leads no período
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-400 dark:bg-zinc-800">
        Ativas na Meta <Info className="h-3 w-3" /> Fase 2
      </span>
      <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-zinc-500">
        <input
          type="checkbox"
          checked={hideNoCampaign}
          onChange={(e) => setHideNoCampaign(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-zinc-300"
        />
        Ocultar &quot;sem campanha&quot;
      </label>
    </div>
  );
}

function HealthPill({ label, pct, n, total, good }: { label: string; pct: number; n: number; total: number; good: number }) {
  const color = pct >= good ? '#10b981' : pct >= good / 2 ? '#f59e0b' : '#ef4444';
  return (
    <div className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
      <div className="text-[11px] font-medium text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums" style={{ color }}>{pct}%</div>
      <div className="text-[10px] text-zinc-400">{n} de {total}</div>
    </div>
  );
}

function IntakeHealthPanel() {
  const orgId = useOrgId();
  const { data, isLoading } = useQuery({
    queryKey: ['lead-intake-health', orgId],
    queryFn: () => dashboardService.getIntakeHealth(),
    staleTime: 60000,
  });
  const d: IntakeHealth | undefined = data;
  return (
    <SectionCard
      title="Diagnóstico de captação (n8n → CRM)"
      icon={Info}
      subtitle="Os leads estão chegando com telefone e UTMs? (últimos 30 dias)"
    >
      {isLoading || !d ? (
        <p className="text-sm text-zinc-400">Carregando…</p>
      ) : d.total === 0 ? (
        <Empty />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <HealthPill label="Com telefone" pct={d.comTelefonePct} n={d.comTelefone} total={d.total} good={80} />
            <HealthPill label="Com utm_source" pct={d.comUtmSourcePct} n={d.comUtmSource} total={d.total} good={70} />
            <HealthPill label="Com utm_campaign" pct={d.comUtmCampaignPct} n={d.comUtmCampaign} total={d.total} good={70} />
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-300">
            {d.comUtmSourcePct < 40
              ? 'A maioria dos leads está chegando SEM utm_source — verifique o mapeamento no n8n e a captura de UTM na landing page.'
              : d.comTelefonePct < 80
                ? 'Alguns leads chegam sem telefone — sem ele não há fusão com a conversa do WhatsApp.'
                : 'Captação saudável: telefone e UTMs chegando na maioria dos leads.'}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-xs">
              <thead>
                <tr className="border-b border-zinc-100 text-left uppercase tracking-wide text-zinc-400 dark:border-zinc-800">
                  <th className="py-1.5 pr-2 font-medium">Quando</th>
                  <th className="px-2 py-1.5 font-medium">Nome</th>
                  <th className="px-2 py-1.5 font-medium">Telefone</th>
                  <th className="px-2 py-1.5 font-medium">utm_source</th>
                  <th className="px-2 py-1.5 font-medium">utm_campaign</th>
                </tr>
              </thead>
              <tbody>
                {d.sample.map((r, i) => (
                  <tr key={i} className="border-b border-zinc-50 last:border-0 dark:border-zinc-800/50">
                    <td className="py-1.5 pr-2 text-zinc-500">{new Date(r.date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-2 py-1.5 text-zinc-800 dark:text-zinc-200">{r.nome ?? '—'}</td>
                    <td className={`px-2 py-1.5 ${r.telefone ? 'text-zinc-700 dark:text-zinc-300' : 'text-red-500'}`}>{r.telefone ?? 'faltando'}</td>
                    <td className={`px-2 py-1.5 ${r.utmSource ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{r.utmSource ?? 'faltando'}</td>
                    <td className={`px-2 py-1.5 ${r.utmCampaign ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-400'}`}>{r.utmCampaign ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function MetaAdsPanel({ overview }: { overview: CommercialData['overview'] }) {
  const qc = useQueryClient();
  const { data: status } = useQuery<MetaAdsStatus>({
    queryKey: ['meta-ads-status'],
    queryFn: () => dashboardService.getMetaAds(),
    staleTime: 60000,
  });
  const [adAccountId, setAdAccountId] = useState('');
  const [token, setToken] = useState('');
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['meta-ads-status'] });
    void qc.invalidateQueries({ queryKey: ['dashboard-commercial'] });
  };
  const saveMut = useMutation({
    mutationFn: () => dashboardService.setMetaAds(adAccountId.trim(), token.trim()),
    onSuccess: () => {
      toast.success('Meta Ads conectada');
      setToken('');
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Falha ao conectar'),
  });
  const clearMut = useMutation({
    mutationFn: () => dashboardService.clearMetaAds(),
    onSuccess: () => {
      toast.success('Integração removida');
      invalidate();
    },
  });
  const cls =
    'mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white';

  return (
    <SectionCard
      title="Investimento e retorno (Meta Ads)"
      icon={DollarSign}
      subtitle={
        status?.configured
          ? `${status.adAccountIds?.length ?? 1} conta(s) de anúncios · gasto por campanha da Meta`
          : 'Conecte a conta de anúncios (token com ads_read) para ver Gasto, CAC e ROAS'
      }
    >
      {status?.configured ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
              <div className="text-[11px] text-zinc-500">Gasto (período)</div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                {overview.gasto != null ? brl(overview.gasto) : '—'}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
              <div className="text-[11px] text-zinc-500">CAC (custo por pedido)</div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                {overview.cac != null ? brl(overview.cac) : '—'}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
              <div className="text-[11px] text-zinc-500">ROAS</div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {overview.roas != null ? `${overview.roas}x` : '—'}
              </div>
            </div>
          </div>
          {status.lastError && (
            <p className="text-xs text-red-500">Erro na última leitura da Meta: {status.lastError}</p>
          )}
          <button
            type="button"
            onClick={() => clearMut.mutate()}
            className="text-xs text-zinc-400 hover:text-red-500"
          >
            Remover integração
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="sm:w-56">
            <label className="text-[11px] text-zinc-500">IDs da conta</label>
            <input
              value={adAccountId}
              onChange={(e) => setAdAccountId(e.target.value)}
              placeholder="1234567890, 9876543210"
              className={cls}
            />
            <p className="mt-1 text-[10px] text-zinc-400">Só o número. Várias contas? separe por vírgula.</p>
          </div>
          <div className="flex-1">
            <label className="text-[11px] text-zinc-500">Token (Usuário do Sistema · ads_read)</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="EAAB..."
              className={cls}
            />
          </div>
          <button
            type="button"
            disabled={saveMut.isPending || !adAccountId.trim() || !token.trim()}
            onClick={() => saveMut.mutate()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Conectar
          </button>
        </div>
      )}
    </SectionCard>
  );
}

const EVO_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#a1a1aa'];
const evoTooltip = {
  background: 'rgba(24,24,27,0.92)', border: 'none', borderRadius: 6,
  fontSize: 11, padding: '6px 10px', color: '#fff',
};

function EvolutionCharts({ series }: { series: CommercialData['series'] }) {
  const origins = series.origins;
  if (origins.length === 0) {
    return (
      <SectionCard title="Evolução por origem" icon={TrendingUp} subtitle="conversão e orçamentos ao longo do período">
        <Empty />
      </SectionCard>
    );
  }
  const lines = origins.map((o, i) => (
    <Line
      key={o}
      type="monotone"
      dataKey={o}
      stroke={EVO_COLORS[i % EVO_COLORS.length]}
      strokeWidth={2}
      dot={false}
      connectNulls={false}
      isAnimationActive={false}
    />
  ));
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard title="Evolução da conversão" icon={TrendingUp} subtitle="% lead→pedido por origem">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series.conversion} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" strokeOpacity={0.4} />
              <XAxis dataKey="date" tickFormatter={(x) => String(x).slice(5)} fontSize={10} />
              <YAxis unit="%" fontSize={10} />
              <Tooltip contentStyle={evoTooltip} formatter={(v) => (v == null ? ['—', ''] : [`${v}%`, ''])} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {lines}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
      <SectionCard title="Evolução de orçamentos" icon={FileText} subtitle="orçamentos gerados por origem">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series.orcamentos} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" strokeOpacity={0.4} />
              <XAxis dataKey="date" tickFormatter={(x) => String(x).slice(5)} fontSize={10} />
              <YAxis allowDecimals={false} fontSize={10} />
              <Tooltip contentStyle={evoTooltip} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {origins.map((o, i) => (
                <Line
                  key={o}
                  type="monotone"
                  dataKey={o}
                  stroke={EVO_COLORS[i % EVO_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}
