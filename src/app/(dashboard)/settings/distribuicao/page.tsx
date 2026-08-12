'use client';

/**
 * Configurações → Distribuição de leads. Orquestrador que reparte cada lead
 * novo (conversa sem responsável) entre vendedores por SORTEIO PONDERADO
 * conforme os pesos. O "% efetivo" mostra a proporção real que cada um recebe.
 */
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Users, Shuffle, Filter } from 'lucide-react';
import { membersService } from '@/features/settings/services/members.service';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import {
  leadDistributionService,
  type LeadWeight,
} from '@/features/settings/services/lead-distribution.service';

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
  // Pesos por userId (string do input pra permitir vazio).
  const [weights, setWeights] = useState<Record<string, string>>({});
  // Funis selecionados. Vazio = todos os funis.
  const [pipelineIds, setPipelineIds] = useState<string[]>([]);
  useEffect(() => {
    if (cfg) {
      setEnabled(cfg.enabled);
      const w: Record<string, string> = {};
      for (const it of cfg.weights) w[it.userId] = String(it.weight ?? 0);
      setWeights(w);
      setPipelineIds(cfg.pipelineIds ?? []);
    }
  }, [cfg]);

  const togglePipeline = (id: string) =>
    setPipelineIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );

  // Só quem pode receber lead: membros que atendem (exclui ninguém por padrão).
  const sellers = useMemo(
    () => (members ?? []).filter((m) => m.user?.isActive !== false),
    [members],
  );

  const totalPeso = useMemo(
    () =>
      sellers.reduce((s, m) => s + (parseFloat(weights[m.userId] || '0') || 0), 0),
    [sellers, weights],
  );

  const save = useMutation({
    mutationFn: () => {
      const payload: LeadWeight[] = sellers
        .map((m) => ({
          userId: m.userId,
          weight: parseFloat(weights[m.userId] || '0') || 0,
        }))
        .filter((w) => w.weight > 0);
      return leadDistributionService.updateConfig({ enabled, weights: payload, pipelineIds });
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
          Reparte automaticamente cada lead novo (sem responsável) entre os
          vendedores, por sorteio ponderado conforme os pesos. Ex.: 50/30/20 →
          a cada 10 leads, ~5/3/2.
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

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-1 border-b border-zinc-200 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:border-zinc-800">
          <Filter className="h-3.5 w-3.5" /> Funis que participam do sorteio
        </div>
        <div className="flex flex-wrap gap-2 px-4 py-3">
          {(pipelines ?? []).map((p) => {
            const on = pipelineIds.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePipeline(p.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  on
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-zinc-300 text-zinc-500 hover:border-zinc-400 dark:border-zinc-700'
                }`}
              >
                {p.name}
              </button>
            );
          })}
          {(pipelines ?? []).length === 0 && (
            <span className="text-sm text-zinc-400">Nenhum funil ativo.</span>
          )}
        </div>
        <div className="border-t border-zinc-200 px-4 py-2 text-[11px] text-zinc-400 dark:border-zinc-800">
          {pipelineIds.length === 0
            ? 'Nenhum funil marcado = sorteia leads de todos os funis.'
            : `Sorteia apenas leads que entram em ${pipelineIds.length} funil(is). Leads de outros funis seguem o fluxo padrão.`}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:border-zinc-800">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> Vendedor
          </span>
          <span>Peso · % efetivo</span>
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {sellers.map((m) => {
            const w = parseFloat(weights[m.userId] || '0') || 0;
            const pct = totalPeso > 0 ? (w / totalPeso) * 100 : 0;
            return (
              <div key={m.userId} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {m.user?.name || m.user?.email}
                  </div>
                  <div className="text-[11px] text-zinc-400">{m.role}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-14 text-right text-xs tabular-nums text-zinc-500">
                    {w > 0 ? `${pct.toFixed(0)}%` : '—'}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={weights[m.userId] ?? ''}
                    onChange={(e) =>
                      setWeights({ ...weights, [m.userId]: e.target.value })
                    }
                    placeholder="0"
                    className="w-20 rounded-md border border-zinc-300 px-2 py-1.5 text-right text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
              </div>
            );
          })}
          {sellers.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-zinc-400">
              Nenhum membro para distribuir.
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800">
          <span>Soma dos pesos: {totalPeso || 0}</span>
          <span>Quem fica com 0 não recebe leads.</span>
        </div>
      </div>

      <button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Salvar
      </button>
      <p className="text-[11px] text-zinc-400">
        Os pesos não precisam somar 100 — o sistema normaliza pela proporção. O
        "% efetivo" ao lado de cada vendedor mostra a chance real de receber cada
        lead novo.
      </p>
    </div>
  );
}
