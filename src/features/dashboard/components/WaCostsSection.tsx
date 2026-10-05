'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign, MessageSquare, Megaphone, Bell, ShieldCheck, Headphones, AlertTriangle, X, Loader2,
} from 'lucide-react';
import {
  dashboardService,
  type WaCostsData,
  type WaCatKey,
  type WaCostMessage,
} from '@/features/dashboard/services/dashboard.service';
import { useOrgId } from '@/hooks/use-org-query-key';

const brl = (micros: string) =>
  (Number(micros || '0') / 1_000_000).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

const CAT_META: Record<WaCatKey, { label: string; icon: React.ElementType; color: string }> = {
  MARKETING: { label: 'Marketing', icon: Megaphone, color: '#8b5cf6' },
  UTILITY: { label: 'Utility', icon: Bell, color: '#3b82f6' },
  AUTHENTICATION: { label: 'Autenticação', icon: ShieldCheck, color: '#f59e0b' },
  SERVICE: { label: 'Serviço', icon: Headphones, color: '#10b981' },
};
const CATS: WaCatKey[] = ['MARKETING', 'UTILITY', 'AUTHENTICATION', 'SERVICE'];

function Kpi({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent: string;
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

function ServiceBar({ used, free, pct, over }: { used: number; free: number; pct: number; over: number }) {
  const color = over > 0 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981';
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-600 dark:text-zinc-300">Mensagens de serviço no mês</span>
        <span className="tabular-nums font-medium text-zinc-800 dark:text-zinc-200">
          {used.toLocaleString('pt-BR')} / {free.toLocaleString('pt-BR')} grátis
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
      </div>
      {over > 0 ? (
        <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
          <AlertTriangle className="h-3 w-3" /> {over.toLocaleString('pt-BR')} acima da franquia — já cobrando o excedente
        </p>
      ) : pct >= 80 ? (
        <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3 w-3" /> {pct}% da franquia usada — perto de começar a pagar
        </p>
      ) : (
        <p className="mt-1 text-[11px] text-zinc-400">{pct}% da franquia grátis usada</p>
      )}
    </div>
  );
}

export function WaCostsSection({ from, to }: { from?: string; to?: string } = {}) {
  const orgId = useOrgId();
  const [drill, setDrill] = useState<{
    channelId: string;
    channelName: string;
    category: WaCatKey;
    label: string;
  } | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-wa-costs', orgId, from, to],
    queryFn: () => dashboardService.getWaCosts(from, to),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900" />
        ))}
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
        Não foi possível carregar os custos do WhatsApp.
      </div>
    );
  }

  const d: WaCostsData = data;
  const mesLabel = new Date(d.from).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const semDados = d.totals.totalCount === 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Custos WhatsApp</h2>
        <p className="text-sm text-zinc-500">
          Custo real por mensagem (categoria da Meta), {mesLabel}. Desde 1º/out/2026 a Meta cobra
          mensagens de serviço acima de 1.000/número/mês e templates de utility dentro da janela de 24h.
        </p>
      </div>

      {semDados ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40">
          Ainda sem dados de custo neste mês. O custo real é coletado dos webhooks da Meta a partir de agora —
          o histórico anterior não é reconstruído. Volte após algumas mensagens fluírem.
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Kpi label="Custo real do mês" value={brl(d.totals.totalCostMicros)} sub={`${d.totals.totalCount.toLocaleString('pt-BR')} mensagens cobradas/registradas`} icon={DollarSign} accent="#10b981" />
            <Kpi label="Mensagens de serviço" value={d.totals.serviceUsed.toLocaleString('pt-BR')} sub={`franquia de ${d.serviceFreeAllowance.toLocaleString('pt-BR')} grátis por número`} icon={Headphones} accent="#3b82f6" />
            <Kpi label="Marketing (mês)" value={brl(d.totals.byCategory.MARKETING.costMicros)} sub={`${d.totals.byCategory.MARKETING.count.toLocaleString('pt-BR')} mensagens`} icon={Megaphone} accent="#8b5cf6" />
          </div>

          <div className="space-y-4">
            {d.channels.map((ch) => (
              <div key={ch.channelId} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-emerald-500" />
                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{ch.name}</h3>
                    {ch.phoneNumberId && <span className="text-[11px] text-zinc-400">#{ch.phoneNumberId}</span>}
                  </div>
                  <span className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{brl(ch.totalCostMicros)}</span>
                </div>

                <div className="mt-4">
                  <ServiceBar used={ch.serviceUsed} free={ch.serviceFree} pct={ch.servicePctUsed} over={ch.serviceOver} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {CATS.map((c) => {
                    const meta = CAT_META[c];
                    const cell = ch.byCategory[c];
                    const Icon = meta.icon;
                    const clickable = cell.count > 0;
                    return (
                      <button
                        key={c}
                        type="button"
                        disabled={!clickable}
                        onClick={() =>
                          setDrill({
                            channelId: ch.channelId,
                            channelName: ch.name,
                            category: c,
                            label: meta.label,
                          })
                        }
                        title={clickable ? 'Ver as mensagens desta categoria' : undefined}
                        className={`rounded-lg border border-zinc-100 p-3 text-left dark:border-zinc-800 ${
                          clickable ? 'cursor-pointer hover:border-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/40' : 'cursor-default'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
                          <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} /> {meta.label}
                        </div>
                        <div className="mt-1 text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{brl(cell.costMicros)}</div>
                        <div className="text-[10px] text-zinc-400">{cell.count.toLocaleString('pt-BR')} msgs</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {d.channels.length === 0 && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40">
                Nenhum canal WhatsApp Oficial com custos no período.
              </div>
            )}
          </div>

          <p className="text-[11px] text-zinc-400">
            Cada número tem franquia própria de {d.serviceFreeAllowance.toLocaleString('pt-BR')} mensagens de serviço grátis/mês —
            distribuir o atendimento entre os números aumenta a franquia total. Valores estimados pela categoria real da Meta × rate card em BRL.
          </p>
        </>
      )}

      {drill && (
        <WaCostDrill
          channelId={drill.channelId}
          channelName={drill.channelName}
          category={drill.category}
          label={drill.label}
          from={from}
          to={to}
          onClose={() => setDrill(null)}
        />
      )}
    </div>
  );
}

/** Modal com a lista das mensagens que geraram o custo de uma categoria/número. */
function WaCostDrill({
  channelId,
  channelName,
  category,
  label,
  from,
  to,
  onClose,
}: {
  channelId: string;
  channelName: string;
  category: WaCatKey;
  label: string;
  from?: string;
  to?: string;
  onClose: () => void;
}) {
  const { data: msgs, isLoading } = useQuery({
    queryKey: ['wa-cost-messages', channelId, category, from, to],
    queryFn: () => dashboardService.getWaCostMessages(channelId, category, from, to),
  });
  const list: WaCostMessage[] = msgs ?? [];
  const dt = (s: string) =>
    new Date(s).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Mensagens · {label}
            </h3>
            <p className="text-[11px] text-zinc-500">{channelName} · {list.length} mensagem(ns)</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-400">Sem mensagens no período.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-zinc-50 text-left uppercase tracking-wide text-zinc-400 dark:bg-zinc-950/60">
                <tr>
                  <th className="px-4 py-2 font-medium">Quando</th>
                  <th className="px-4 py-2 font-medium">Contato</th>
                  <th className="px-4 py-2 font-medium">Origem</th>
                  <th className="px-4 py-2 text-right font-medium">Custo</th>
                </tr>
              </thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.wamid} className="border-t border-zinc-50 dark:border-zinc-800/50">
                    <td className="whitespace-nowrap px-4 py-2 text-zinc-500">{dt(m.occurredAt)}</td>
                    <td className="px-4 py-2 text-zinc-800 dark:text-zinc-200">
                      {m.conversationId ? (
                        <Link
                          href={`/inbox?conversationId=${m.conversationId}`}
                          className="text-primary hover:underline"
                          title="Abrir a conversa nesta mensagem"
                        >
                          {m.contactName || m.contactPhone || '—'}
                        </Link>
                      ) : (
                        m.contactName || m.contactPhone || '—'
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {m.origem === 'disparo' ? (
                        <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                          Disparo{m.broadcastName ? `: ${m.broadcastName}` : ''}
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          Atendimento
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-200">
                      {m.billable ? brl(m.costMicros) : 'grátis'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
