'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

interface MergeSummary {
  channels: number;
  pairsFound: number;
  merged: number;
  cardsAbsorbed: number;
  errors: { pair: string; error: string }[];
  preview: { lid: string; phone: string }[];
}

async function runMerge(execute: boolean): Promise<MergeSummary> {
  const { data } = await api.post(
    `/whatsapp-merge/lids${execute ? '?execute=true' : ''}`,
    {},
  );
  return data.data ?? data;
}

export default function DuplicadosPage() {
  const [result, setResult] = useState<MergeSummary | null>(null);
  const [mode, setMode] = useState<'preview' | 'execute' | null>(null);

  const preview = useMutation({
    mutationFn: () => runMerge(false),
    onSuccess: (r) => {
      setResult(r);
      setMode('preview');
      toast.success(`Prévia: ${r.pairsFound} lead(s) duplicado(s) encontrados`);
    },
    onError: (e: any) => toast.error(e?.message ?? 'Falha na prévia'),
  });

  const execute = useMutation({
    mutationFn: () => runMerge(true),
    onSuccess: (r) => {
      setResult(r);
      setMode('execute');
      toast.success(`Unificados: ${r.merged} lead(s), ${r.cardsAbsorbed} card(s) absorvidos`);
    },
    onError: (e: any) => toast.error(e?.message ?? 'Falha ao unir'),
  });

  const busy = preview.isPending || execute.isPending;

  return (
    <div className="max-w-2xl">
      <div className="mb-2 flex items-center gap-2">
        <Copy className="h-5 w-5 text-zinc-500" />
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Leads duplicados (WhatsApp)
        </h2>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        O WhatsApp passou a esconder o número do cliente atrás de um LID, o que
        criou contatos/cards duplicados (um com as mensagens enviadas, outro com
        as recebidas). A correção já evita novos duplicados. Aqui você une os que
        já existem: o contato do número (mais completo) é mantido e re-chaveado
        pelo LID; quando há 2 cards, fica o <b>mais avançado</b> no funil.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={() => preview.mutate()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {preview.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Rodar prévia
        </button>
        <button
          onClick={() => {
            if (
              window.confirm(
                'Unir os leads duplicados agora? Contatos/conversas/cards serão mesclados. Recomendado rodar a prévia antes.',
              )
            ) {
              execute.mutate();
            }
          }}
          disabled={busy || !result || result.pairsFound === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {execute.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Unir agora
        </button>
      </div>

      {result && (
        <div className="mt-6 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-sm font-medium">
            {mode === 'execute' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
            {mode === 'execute' ? 'Resultado da unificação' : 'Prévia (nada foi alterado)'}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat label="Canais" value={result.channels} />
            <Stat label="Duplicados" value={result.pairsFound} />
            {mode === 'execute' && <Stat label="Unificados" value={result.merged} />}
            {mode === 'execute' && (
              <Stat label="Cards absorvidos" value={result.cardsAbsorbed} />
            )}
          </div>
          {result.errors?.length > 0 && (
            <div className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
              {result.errors.length} erro(s): {result.errors.slice(0, 3).map((e) => e.pair).join(', ')}
            </div>
          )}
          {mode === 'preview' && result.preview?.length > 0 && (
            <div className="mt-3">
              <p className="mb-1 text-xs font-medium text-zinc-500">
                Exemplos (LID → número):
              </p>
              <div className="max-h-48 overflow-y-auto rounded-lg bg-zinc-50 p-2 text-xs dark:bg-zinc-800/50">
                {result.preview.slice(0, 30).map((p) => (
                  <div key={p.lid} className="tabular-nums text-zinc-600 dark:text-zinc-400">
                    {p.lid} → {p.phone}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
      <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {value}
      </div>
      <div className="text-[11px] text-zinc-500">{label}</div>
    </div>
  );
}
