'use client';

import { Fragment, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ChevronDown, Megaphone, AlertTriangle, Info } from 'lucide-react';
import {
  dashboardService,
  type AdsMetrics,
  type AdsPerformanceData,
  type AdsCampaignNode,
} from '@/features/dashboard/services/dashboard.service';
import { useOrgId } from '@/hooks/use-org-query-key';

const brl = (n: number | null | undefined) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
const brl2 = (n: number | null | undefined) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(n);
const int = (n: number) => (n || 0).toLocaleString('pt-BR');
const share = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

type SortKey = 'gasto' | 'vendasValor' | 'roas' | 'leads';
const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: 'gasto', label: 'Gasto' },
  { key: 'vendasValor', label: 'Receita' },
  { key: 'roas', label: 'ROAS' },
  { key: 'leads', label: 'Leads' },
];
const sortVal = (m: AdsMetrics, k: SortKey) => (k === 'roas' ? m.roas ?? -1 : m[k]);

const hasActivity = (m: AdsMetrics) => m.gasto > 0 || m.leads > 0 || m.orcamentos > 0 || m.vendas > 0;

/** ROAS colorido: só quando houve gasto. */
function Roas({ m }: { m: AdsMetrics }) {
  if (m.roas == null) return <span className="text-zinc-400">—</span>;
  const cls =
    m.roas >= 3
      ? 'text-emerald-600 dark:text-emerald-400'
      : m.roas >= 1
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400';
  return <span className={`font-semibold ${cls}`}>{m.roas.toLocaleString('pt-BR')}x</span>;
}

/** Selo: parte relevante da receita ligada ao cliente só pelo nome. */
function NomeSeal({ m }: { m: AdsMetrics }) {
  if (m.receitaPorNomePct == null || m.receitaPorNomePct < 1) return <span className="text-zinc-300 dark:text-zinc-600">—</span>;
  const strong = m.receitaPorNomePct >= 50;
  return (
    <span
      title="Parte da receita destas vendas em que o pedido foi ligado ao cliente só pelo nome (sem CPF/telefone no Tiny)"
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
        strong
          ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
          : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
      }`}
    >
      {strong && <AlertTriangle className="h-3 w-3" />}
      {m.receitaPorNomePct.toLocaleString('pt-BR')}%
    </span>
  );
}

function MetricCells({ m }: { m: AdsMetrics }) {
  const td = 'px-2 py-2 text-right tabular-nums whitespace-nowrap';
  return (
    <>
      <td className={`${td} font-medium text-zinc-900 dark:text-zinc-100`}>{m.gasto > 0 ? brl(m.gasto) : '—'}</td>
      <td className={td}>{int(m.leads)}</td>
      <td className={td}>{brl2(m.cpl)}</td>
      <td className={td} title="Score ≥ 60 ou com orçamento/pedido">{int(m.leadsQualificados)}</td>
      <td className={td}>
        {int(m.orcamentos)}
        {m.orcamentos > 0 && <span className="block text-[10px] text-zinc-400">{brl(m.orcamentosValor)}</span>}
      </td>
      <td className={td}>{brl(m.custoOrcamento)}</td>
      <td className={td}>
        {int(m.vendas)}
        {m.vendas > 0 && <span className="block text-[10px] text-zinc-400">{brl(m.vendasValor)}</span>}
      </td>
      <td className={td}>{brl(m.cac)}</td>
      <td className={td}><Roas m={m} /></td>
      <td className="pl-2 py-2 text-right"><NomeSeal m={m} /></td>
    </>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{label}</span>
      <div className="mt-1 text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{value}</div>
      {sub && <div className="text-[11px] text-zinc-500">{sub}</div>}
    </div>
  );
}

/**
 * Desempenho por anúncio (campanha › conjunto › anúncio): gasto da Meta ×
 * leads, orçamentos e vendas do Tiny. Crédito ao 1º anúncio do cliente.
 * Toda a agregação vem pronta do backend (`/dashboard/ads-performance`).
 */
export function AdsPerformanceSection({ from, to }: { from: string; to: string }) {
  const orgId = useOrgId();
  const [platform, setPlatform] = useState<string>('all');
  const [sort, setSort] = useState<SortKey>('gasto');
  const [hideIdle, setHideIdle] = useState(true);
  const [open, setOpen] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = useQuery<AdsPerformanceData>({
    queryKey: ['dashboard-ads-performance', orgId, from, to],
    queryFn: () => dashboardService.getAdsPerformance(from, to),
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  });

  const campaigns = useMemo(() => {
    if (!data) return [] as AdsCampaignNode[];
    const by = (a: { metrics: AdsMetrics }, b: { metrics: AdsMetrics }) =>
      sortVal(b.metrics, sort) - sortVal(a.metrics, sort);
    return data.campaigns
      .filter((c) => platform === 'all' || c.platform === platform)
      .filter((c) => !hideIdle || hasActivity(c.metrics))
      .map((c) => ({
        ...c,
        adsets: c.adsets
          .filter((s) => !hideIdle || hasActivity(s.metrics))
          .map((s) => ({ ...s, ads: s.ads.filter((a) => !hideIdle || hasActivity(a.metrics)).sort(by) }))
          .sort(by),
      }))
      .sort(by);
  }, [data, platform, sort, hideIdle]);

  const toggle = (k: string) =>
    setOpen((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const card = 'rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900';
  if (isLoading) return <div className={`${card} h-64 animate-pulse`} />;
  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
        Não foi possível carregar o desempenho por anúncio.
      </div>
    );
  }

  const t = data.totals;
  const cv = data.coverage.vendas;
  const thBase = 'px-2 py-2 text-right font-medium whitespace-nowrap';

  return (
    <div className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <Megaphone className="h-4 w-4 text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Desempenho por anúncio</h3>
          </div>
          <p className="mt-0.5 text-[11px] text-zinc-400">
            Campanha › conjunto › anúncio · gasto da Meta × leads, orçamentos e vendas do Tiny · crédito ao 1º anúncio do cliente
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="all">Todas as plataformas</option>
            {data.platforms.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>Ordenar: {s.label}</option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-zinc-500">
            <input type="checkbox" checked={hideIdle} onChange={(e) => setHideIdle(e.target.checked)} />
            Ocultar sem gasto e sem resultado
          </label>
        </div>
      </div>

      {!data.metaConfigured && (
        <p className="mt-3 flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1.5 text-[11px] text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
          <Info className="h-3.5 w-3.5" /> Meta Ads não conectada: aparecem leads e vendas por anúncio, mas sem gasto, CPL, CAC e ROAS.
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Gasto" value={brl(t.gasto)} sub={t.ctr != null ? `CTR ${t.ctr.toLocaleString('pt-BR')}%` : undefined} />
        <Kpi label="Leads novos" value={int(t.leads)} sub={`CPL ${brl2(t.cpl)}`} />
        <Kpi label="Qualificados" value={int(t.leadsQualificados)} sub={`${brl2(t.custoLeadQualificado)} cada`} />
        <Kpi label="Orçamentos" value={int(t.orcamentos)} sub={`${brl(t.orcamentosValor)} · ${brl(t.custoOrcamento)} cada`} />
        <Kpi label="Vendas" value={int(t.vendas)} sub={`${brl(t.vendasValor)} · CAC ${brl(t.cac)}`} />
        <Kpi label="ROAS" value={t.roas != null ? `${t.roas.toLocaleString('pt-BR')}x` : '—'} sub="receita de vendas ÷ gasto" />
      </div>

      <p className="mt-3 text-[11px] text-zinc-500">
        Das vendas do período, <b>{share(cv.comAnuncio.valor, cv.total.valor)}%</b> da receita chegou a um anúncio
        ({share(cv.casadoComMeta.valor, cv.total.valor)}% casada com a estrutura da Meta).{' '}
        {cv.porNome.valor > 0 && (
          <>
            <b>{share(cv.porNome.valor, cv.comAnuncio.valor)}%</b> dessa receita foi ligada ao cliente só pelo nome (coluna
            &quot;Por nome&quot;).
          </>
        )}
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-left text-[11px] uppercase tracking-wide text-zinc-400 dark:border-zinc-800">
              <th className="py-2 pr-2 font-medium">Campanha / conjunto / anúncio</th>
              <th className={thBase}>Gasto</th>
              <th className={thBase}>Leads</th>
              <th className={thBase}>CPL</th>
              <th className={thBase}>Qualif.</th>
              <th className={thBase}>Orçam.</th>
              <th className={thBase}>R$/orçam.</th>
              <th className={thBase}>Vendas</th>
              <th className={thBase}>CAC</th>
              <th className={thBase}>ROAS</th>
              <th className="pl-2 py-2 text-right font-medium whitespace-nowrap">Por nome</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={11} className="py-6 text-center text-zinc-400">Nenhum anúncio com gasto ou resultado no período.</td>
              </tr>
            )}
            {campaigns.map((c) => {
              const cOpen = open.has(c.key);
              return (
                <Fragment key={c.key}>
                  <tr
                    className="cursor-pointer border-b border-zinc-50 hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/40"
                    onClick={() => toggle(c.key)}
                  >
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-1">
                        {cOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-400" />}
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{c.name}</span>
                        <span className="ml-1 rounded bg-zinc-100 px-1 text-[10px] text-zinc-500 dark:bg-zinc-800">{c.platform}</span>
                      </div>
                    </td>
                    <MetricCells m={c.metrics} />
                  </tr>
                  {cOpen &&
                    c.adsets.map((s) => {
                      const sOpen = open.has(s.key);
                      return (
                        <Fragment key={s.key}>
                          <tr
                            className="cursor-pointer border-b border-zinc-50 bg-zinc-50/40 hover:bg-zinc-50 dark:border-zinc-800/50 dark:bg-zinc-800/20"
                            onClick={() => toggle(s.key)}
                          >
                            <td className="py-2 pl-6 pr-2">
                              <div className="flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
                                {sOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-400" />}
                                {s.name}
                              </div>
                            </td>
                            <MetricCells m={s.metrics} />
                          </tr>
                          {sOpen &&
                            s.ads.map((a) => (
                              <tr key={a.key} className="border-b border-zinc-50 dark:border-zinc-800/50">
                                <td className="py-2 pl-12 pr-2 text-zinc-600 dark:text-zinc-400">{a.name}</td>
                                <MetricCells m={a.metrics} />
                              </tr>
                            ))}
                        </Fragment>
                      );
                    })}
                </Fragment>
              );
            })}
            {data.nonAd.map((x) => (
              <tr key={x.key} className="border-b border-zinc-50 text-zinc-500 last:border-0 dark:border-zinc-800/50">
                <td className="py-2 pr-2 italic">{x.label}</td>
                <MetricCells m={x.metrics} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-zinc-400">
        Leads = clientes cujo 1º anúncio foi no período. Orçamentos e vendas = documentos do Tiny com data no período,
        creditados ao 1º anúncio que o cliente tocou até a data do documento. Vendas efetivas (sem marketplace e sem cancelados).
      </p>
    </div>
  );
}
