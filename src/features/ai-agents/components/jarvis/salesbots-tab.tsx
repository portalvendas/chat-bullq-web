'use client';

import { useRef, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Workflow, Plus, Trash2, Loader2, Loader, X, Upload } from 'lucide-react';
import {
  cadencesService,
  type Cadence,
  type CadenceTrigger,
  type WorkflowGraph,
} from '@/features/cadences/services/cadences.service';
import {
  graphFromCadence,
  emptyGraph,
  followupGraph,
} from '@/features/cadences/graph-utils';
import { SalesbotCanvas } from '@/features/cadences/components/salesbot-canvas';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';

function nodeCount(c: Cadence): number {
  const g = c.graph;
  if (g && Array.isArray(g.nodes) && g.nodes.length) {
    return g.nodes.filter((n) => n.type !== 'start' && n.type !== 'stop').length;
  }
  return c.steps?.length ?? 0;
}

/**
 * Jarvis > Salesbots. Cada bot é um workflow visual (canvas estilo Kommo) com
 * ramificações: nós de mensagem/espera/ação conectados, onde a espera bifurca
 * entre "tempo" e "cliente respondeu".
 */
export function JarvisSalesbotsTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Cadence | null>(null);
  const [creating, setCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: bots = [], isLoading } = useQuery({
    queryKey: ['cadences'],
    queryFn: () => cadencesService.list(),
    staleTime: 10_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['cadences'] });

  const remove = useMutation({
    mutationFn: (id: string) => cadencesService.remove(id),
    onSuccess: () => {
      toast.success('Salesbot removido');
      invalidate();
    },
    onError: () => toast.error('Erro ao remover'),
  });
  const toggle = useMutation({
    mutationFn: (c: Cadence) =>
      cadencesService.update(c.id, { name: c.name, active: !c.active }),
    onSuccess: () => invalidate(),
    onError: () => toast.error('Erro ao atualizar'),
  });
  const importKommo = useMutation({
    mutationFn: async (files: File[]) => {
      const payload: Array<{ name: string; model: unknown }> = [];
      for (const file of files) {
        const raw = await file.text();
        let parsed: any;
        try {
          parsed = JSON.parse(raw);
        } catch {
          throw new Error(`${file.name}: JSON inválido`);
        }
        const model = parsed?.model ?? parsed;
        const name = file.name.replace(/\.json$/i, '').trim();
        payload.push({ name, model });
      }
      return cadencesService.importKommo(payload);
    },
    onSuccess: (r) => {
      const errs = r.results.filter((x) => x.status === 'error').length;
      toast.success(
        `Import concluído: ${r.created} criado(s), ${r.skipped} já existia(m)` +
          (errs ? `, ${errs} com erro` : ''),
      );
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? 'Falha ao importar'),
  });

  const onFilesPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) importKommo.mutate(files);
    e.target.value = ''; // permite reimportar os mesmos arquivos
  };

  const seedFollowup = useMutation({
    mutationFn: () =>
      cadencesService.create({
        name: 'Follow-up de orçamento',
        triggerType: 'MANUAL',
        stopOnReply: true,
        graph: followupGraph(),
        onEnd: {},
      }),
    onSuccess: () => {
      toast.success('Salesbot de exemplo criado (Follow-up de orçamento).');
      invalidate();
    },
    onError: () => toast.error('Erro ao criar exemplo'),
  });

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <Workflow className="h-5 w-5 text-zinc-500" />
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Salesbots
          </h2>
          <p className="text-xs text-zinc-500">
            Bots de atendimento com workflow visual e ramificações — igual ao
            Salesbot do Kommo.
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          multiple
          onChange={onFilesPicked}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={importKommo.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {importKommo.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          Importar do Kommo
        </button>
        {bots.length === 0 && (
          <button
            onClick={() => seedFollowup.mutate()}
            disabled={seedFollowup.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {seedFollowup.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            Bot de exemplo
          </button>
        )}
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> Novo Salesbot
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : bots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 px-8 py-16 text-center dark:border-zinc-800">
          <Workflow className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-500">
            Nenhum Salesbot ainda. Crie o primeiro (ex: Follow-up de orçamento).
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {bots.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <button
                onClick={() => toggle.mutate(c)}
                title={c.active ? 'Ativo' : 'Pausado'}
                className={`h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors ${
                  c.active ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                    c.active ? 'translate-x-4' : ''
                  }`}
                />
              </button>
              <button onClick={() => setEditing(c)} className="min-w-0 flex-1 text-left">
                <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {c.name}
                </div>
                <div className="mt-0.5 text-[11px] text-zinc-500">
                  {c.triggerType === 'TAG_ADDED'
                    ? `gatilho: tag "${c.triggerValue ?? '—'}"`
                    : c.triggerType === 'STAGE_ENTERED'
                      ? 'gatilho: entrar em etapa do funil'
                      : 'início manual'}{' '}
                  · {nodeCount(c)} nó(s) ·{' '}
                  {c.stopOnReply ? 'para na resposta' : 'não para'} ·{' '}
                  {c._count?.runs ?? 0} execuções
                </div>
              </button>
              <button
                onClick={() =>
                  confirm(`Remover o Salesbot "${c.name}"?`) && remove.mutate(c.id)
                }
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {(creating || editing) && (
        <SalesbotEditor
          bot={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            invalidate();
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function SalesbotEditor({
  bot,
  onClose,
  onSaved,
}: {
  bot: Cadence | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(bot?.name ?? '');
  const [triggerType, setTriggerType] = useState<CadenceTrigger>(
    bot?.triggerType ?? 'MANUAL',
  );
  const [triggerValue, setTriggerValue] = useState(bot?.triggerValue ?? '');
  const [stopOnReply, setStopOnReply] = useState(bot?.stopOnReply ?? true);
  const [graph, setGraph] = useState<WorkflowGraph>(() =>
    bot ? graphFromCadence(bot) : emptyGraph(),
  );

  const { data: pipelines = [] } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => pipelinesService.list(),
    staleTime: 60_000,
  });

  const save = useMutation({
    mutationFn: () => {
      const dto = {
        name: name.trim(),
        triggerType,
        triggerValue:
          triggerType === 'MANUAL' ? null : triggerValue.trim() || null,
        stopOnReply,
        graph,
        onEnd: {},
      };
      return bot
        ? cadencesService.update(bot.id, dto)
        : cadencesService.create(dto);
    },
    onSuccess: () => {
      toast.success(bot ? 'Salesbot atualizado' : 'Salesbot criado');
      onSaved();
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-zinc-950">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do Salesbot"
          className="w-56 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <select
          value={triggerType}
          onChange={(e) => {
            setTriggerType(e.target.value as CadenceTrigger);
            setTriggerValue('');
          }}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          <option value="MANUAL">Início manual</option>
          <option value="TAG_ADDED">Ao aplicar tag</option>
          <option value="STAGE_ENTERED">Ao entrar em etapa do funil</option>
        </select>
        {triggerType === 'TAG_ADDED' && (
          <input
            value={triggerValue}
            onChange={(e) => setTriggerValue(e.target.value)}
            placeholder="Nome da tag"
            className="w-44 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        )}
        {triggerType === 'STAGE_ENTERED' && (
          <select
            value={triggerValue}
            onChange={(e) => setTriggerValue(e.target.value)}
            className="w-64 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="">Escolha a etapa…</option>
            {pipelines.map((p) => (
              <optgroup key={p.id} label={p.name}>
                {(p.stages ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        )}
        <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={stopOnReply}
            onChange={(e) => setStopOnReply(e.target.checked)}
          />
          parar na resposta
        </label>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onClose}
            disabled={save.isPending}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || !name.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {save.isPending && <Loader className="h-3.5 w-3.5 animate-spin" />}
            Salvar
          </button>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        <SalesbotCanvas graph={graph} onChange={setGraph} />
      </div>
    </div>
  );
}
