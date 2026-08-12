'use client';

/**
 * Configurações → Distribuição de leads. Orquestrador que reparte cada lead
 * novo (conversa sem responsável) entre vendedores por SORTEIO PONDERADO.
 * Os pesos são POR FUNIL — cada funil tem a sua própria classificação (ex.:
 * Mercado Livre 100% p/ um vendedor; Funil de Vendas 70/30). O "% efetivo"
 * mostra a proporção real que cada um recebe naquele funil.
 */
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Users, Shuffle } from 'lucide-react';
import { membersService } from '@/features/settings/services/members.service';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import {
  leadDistributionService,
  type PipelineRule,
} from '@/features/settings/services/lead-distribution.service';

/** Chave da regra padrão aplicada aos demais funis. */
const DEFAULT_KEY = '*';

export default function DistribuicaoPage() {
  const qc = useQueryClient();
  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersService.list(),
    staleTime: 60_000,
  });
  const { data: pipelines } = useQuery({
    queryKey: ['pipelines', 'active'],
    queryFn: () => pipelinesService.list(false),
    staleTime: 60_000,
  });
  const { data: cfg, isLoading } = useQuery({
    queryKey: ['lead-distribution-config'],
    queryFn: () => leadDistributionService.getConfig(),
    staleTime: 30_000,
  });

  const [enabled, setEnabled] = useState(false);
  // Pesos por funil: { [pipelineId | '*']: { [userId]: pesoString } }
  const [byFunnel, setByFunnel] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    if (!cfg) return;
    setEnabled(cfg.enabled);
    const map: Record<string, Record<string, string>> = {};
    for (const rule of cfg.rules ?? []) {
      const w: Record<string, string> = {};
      for (const it of rule.weights) w[it.userId] = String(it.weight ?? 0);
      map[rule.pipelineId] = w;
    }
    setByFunnel(map);
  }, [cfg]);

  const sellers = useMemo(
    () => (members ?? []).filter((m) => m.user?.isActive !== false),
    [members],
  );

  // Cada funil ativo + a linha "padrão" (demais funis) no fim.
  const funnels = useMemo(
    () => [
      ...(pipelines ?? []).map((p) => ({ id: p.id, name: p.name })),
      { id: DEFAULT_KEY, name: 'Demais funis (padrão)' },
    ],
    [pipelines],
  );

  const setWeight = (funnelId: string, userId: string, value: string) =>
    setByFunnel((prev) => ({
      ...prev,
      [funnelId]: { ...(prev[funnelId] ?? {}), [userId]: value },
    }));

  const save = useMutation({
    mutationFn: () => {
      const rules: PipelineRule[] = funnels
        .map((f) => ({
          pipelineId: f.id,
          weights: sellers
            .map((m) => ({
              userId: m.userId,
              weight: parseFloat(byFunnel[f.id]?.[m.userId] || '0') || 0,
            }))
            .filter((w) => w.weight > 0),
        }))
        .filter((r) => r.weights.length > 0);
      return leadDistributionService.updateConfig({ enabled, rules });
    },
    onSuccess: (updated) => {
      qc.setQueryData(['lead-distribution-config'], updated);
      toast.success('Distribuição salva');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Falha ao salvar'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" /> carregando…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          <Shuffle className="h-5 w-5" /> Distribuição de leads
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Cada funil tem a sua própria classificação de pesos. Ex.: Mercado Livre
          100% para um vendedor; Funil de Vendas 70/30. O sorteio usa a regra do
          funil em que o lead entra; funis sem regra própria caem em "Demais
          funis (padrão)".
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-300"
        />
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          Distribuição automática ativa
        </span>
      </label>

      {sellers.length === 0 && (
        <div className="rounded-lg border border-zinc-200 px-4 py-6 text-center text-sm text-zinc-400 dark:border-zinc-800">
          Nenhum membro para distribuir.
        </div>
      )}

      {funnels.map((f) => {
        const weights = byFunnel[f.id] ?? {};
        const total = sellers.reduce(
          (s, m) => s + (parseFloat(weights[m.userId] || '0') || 0),
          0,
        );
        const isDefault = f.id === DEFAULT_KEY;
        return (
          <div
            key={f.id}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
              <span
                className={`text-sm font-semibold ${
                  isDefault
                    ? 'text-zinc-500 dark:text-zinc-400'
                    : 'text-zinc-800 dark:text-zinc-100'
                }`}
              >
                {f.name}
              </span>
              <span className="text-[11px] uppercase tracking-wide text-zinc-400">
                {total > 0 ? `Soma ${total}` : 'sem regra'}
              </span>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {sellers.map((m) => {
                const w = parseFloat(weights[m.userId] || '0') || 0;
                const pct = total > 0 ? (w / total) * 100 : 0;
                return (
                  <div
                    key={m.userId}
                    className="flex items-center justify-between gap-3 px-4 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm text-zinc-700 dark:text-zinc-300">
                        {m.user?.name || m.user?.email}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-12 text-right text-xs tabular-nums text-zinc-500">
                        {w > 0 ? `${pct.toFixed(0)}%` : '—'}
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={weights[m.userId] ?? ''}
                        onChange={(e) => setWeight(f.id, m.userId, e.target.value)}
                        placeholder="0"
                        className="w-20 rounded-md border border-zinc-300 px-2 py-1.5 text-right text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-zinc-200 px-4 py-2 text-[11px] text-zinc-400 dark:border-zinc-800">
              {total > 0
                ? 'Quem fica com 0 não recebe leads deste funil.'
                : isDefault
                  ? 'Sem regra: funis sem configuração própria não são distribuídos.'
                  : 'Sem regra: os leads deste funil seguem o fluxo padrão da ferramenta.'}
            </div>
          </div>
        );
      })}

      <div className="flex items-center gap-3">
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar
        </button>
        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
          <Users className="h-3.5 w-3.5" /> Os pesos não precisam somar 100 — o
          sistema normaliza pela proporção.
        </span>
      </div>
    </div>
  );
}
