'use client';

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Workflow,
  Plus,
  Trash2,
  Loader2,
  MessageSquare,
  Clock,
  Zap,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';
import {
  cadencesService,
  type Cadence,
  type WorkflowStep,
  type StepType,
} from '@/features/cadences/services/cadences.service';

function fmtDelay(min: number): string {
  if (min < 60) return `${min}min`;
  if (min < 1440) return `${Math.round((min / 60) * 10) / 10}h`;
  return `${Math.round((min / 1440) * 10) / 10}d`;
}

const STEP_ICON: Record<StepType, React.ElementType> = {
  message: MessageSquare,
  wait: Clock,
  action: Zap,
};

/**
 * Normaliza passos vindos da API para o formato tipado. Cadências antigas
 * gravaram passos lineares {delayMinutes, text} (sem `type`) — aqui viram
 * [{wait}, {message}], igual ao backend. Passos já tipados passam direto.
 */
function normalizeSteps(raw: unknown): WorkflowStep[] {
  if (!Array.isArray(raw)) return [];
  const out: WorkflowStep[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    if (o.type === 'message' || o.type === 'wait' || o.type === 'action') {
      out.push(o as unknown as WorkflowStep);
      continue;
    }
    // Legado linear: {delayMinutes, text}
    const delay = Number(o.delayMinutes) || 0;
    if (delay > 0) out.push({ type: 'wait', delayMinutes: delay });
    if (typeof o.text === 'string') out.push({ type: 'message', text: o.text });
  }
  return out;
}

/**
 * Jarvis > Salesbots. Espelha o Salesbot do Kommo: cada bot é um workflow
 * ordenado de passos tipados (mensagem, espera, ação). A ordem do array é a
 * ordem de execução. Reaproveita o motor de cadências no backend.
 */
export function JarvisSalesbotsTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Cadence | null>(null);
  const [creating, setCreating] = useState(false);

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
  const seedFollowup = useMutation({
    mutationFn: () =>
      cadencesService.create({
        name: 'Follow-up de orçamento',
        triggerType: 'MANUAL',
        stopOnReply: true,
        steps: [
          { type: 'wait', delayMinutes: 60 },
          { type: 'message', text: 'Oie! Consegue conversar agora ou prefere outro momento?' },
          { type: 'wait', delayMinutes: 180 },
          { type: 'message', text: 'Imagino que a rotina esteja corrida. Fiquei aguardando sua confirmação para seguir com seu orçamento. Me avisa quando puder!' },
          { type: 'wait', delayMinutes: 180 },
          { type: 'message', text: 'Oi, eu de novo 😊 se confirmando nas próximas horas, consigo colocar seu pedido em produção ainda hoje. Me avisa para garantir.' },
          { type: 'wait', delayMinutes: 1200 },
          { type: 'message', text: 'Oi 😊 Estamos com uma condição especial hoje e consigo aplicar diretamente na sua proposta. Posso seguir com o seu orçamento?' },
          { type: 'action', action: 'tag', value: 'NÃO RESPONDEU' },
          { type: 'action', action: 'close' },
        ],
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
            Bots de atendimento com workflow ordenado: mensagens, esperas e
            ações que rodam em sequência e param quando o cliente responde.
          </p>
        </div>
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
              <button
                onClick={() => setEditing(c)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {c.name}
                </div>
                <div className="mt-0.5 text-[11px] text-zinc-500">
                  {c.triggerType === 'TAG_ADDED'
                    ? `gatilho: tag "${c.triggerValue ?? '—'}"`
                    : 'início manual'}{' '}
                  · {c.steps.length} passo(s) ·{' '}
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

function newStep(type: StepType): WorkflowStep {
  if (type === 'message') return { type: 'message', text: '' };
  if (type === 'wait') return { type: 'wait', delayMinutes: 60 };
  return { type: 'action', action: 'tag', value: '' };
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
  const [triggerType, setTriggerType] = useState<'MANUAL' | 'TAG_ADDED'>(
    bot?.triggerType ?? 'MANUAL',
  );
  const [triggerValue, setTriggerValue] = useState(bot?.triggerValue ?? '');
  const [stopOnReply, setStopOnReply] = useState(bot?.stopOnReply ?? true);
  const [steps, setSteps] = useState<WorkflowStep[]>(() => {
    const norm = normalizeSteps(bot?.steps);
    return norm.length ? norm : [{ type: 'message', text: '' }];
  });

  const save = useMutation({
    mutationFn: () => {
      // Construção tipada contextual (clean é WorkflowStep[]): cada push
      // recebe o literal correto sem casts frágeis sobre a união.
      const clean: WorkflowStep[] = [];
      for (const s of steps) {
        if (s.type === 'message') {
          if (s.text.trim()) clean.push({ type: 'message', text: s.text.trim() });
        } else if (s.type === 'wait') {
          clean.push({ type: 'wait', delayMinutes: Number(s.delayMinutes) || 0 });
        } else {
          clean.push({
            type: 'action',
            action: s.action,
            ...(s.value?.trim() ? { value: s.value.trim() } : {}),
          });
        }
      }
      const dto = {
        name: name.trim(),
        triggerType,
        triggerValue: triggerType === 'TAG_ADDED' ? triggerValue.trim() : null,
        stopOnReply,
        steps: clean,
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

  const patchStep = (i: number, patch: Partial<WorkflowStep>) =>
    setSteps((arr) =>
      arr.map((s, idx) => (idx === i ? ({ ...s, ...patch } as WorkflowStep) : s)),
    );
  const removeStep = (i: number) =>
    setSteps((a) => a.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) =>
    setSteps((a) => {
      const j = i + dir;
      if (j < 0 || j >= a.length) return a;
      const next = [...a];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const addStep = (type: StepType) => setSteps((a) => [...a, newStep(type)]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={() => !save.isPending && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {bot ? 'Editar Salesbot' : 'Novo Salesbot'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
          Nome
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Follow-up de orçamento"
          className="mb-3 mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />

        <label className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
          Gatilho
        </label>
        <div className="mb-3 mt-1 flex flex-wrap items-center gap-2">
          <select
            value={triggerType}
            onChange={(e) =>
              setTriggerType(e.target.value as 'MANUAL' | 'TAG_ADDED')
            }
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="MANUAL">Início manual</option>
            <option value="TAG_ADDED">Ao aplicar uma tag</option>
          </select>
          {triggerType === 'TAG_ADDED' && (
            <input
              value={triggerValue}
              onChange={(e) => setTriggerValue(e.target.value)}
              placeholder="Nome exato da tag (ex: Orçamento Enviado)"
              className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          )}
        </div>

        <label className="mb-1 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={stopOnReply}
            onChange={(e) => setStopOnReply(e.target.checked)}
          />
          Parar o bot quando o cliente responder
        </label>

        <div className="mt-3 mb-1 text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
          Workflow (executado em ordem)
        </div>
        <div className="space-y-2">
          {steps.map((s, i) => {
            const Icon = STEP_ICON[s.type] ?? Zap;
            return (
              <div
                key={i}
                className="rounded-lg border border-zinc-200 p-2 dark:border-zinc-800"
              >
                <div className="mb-1.5 flex items-center gap-2 text-[11px] text-zinc-500">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-100 text-zinc-500 dark:bg-zinc-800">
                    {i + 1}
                  </span>
                  <Icon className="h-3.5 w-3.5" />
                  <span className="font-medium">
                    {s.type === 'message'
                      ? 'Mensagem'
                      : s.type === 'wait'
                        ? 'Esperar'
                        : 'Ação'}
                  </span>
                  <div className="ml-auto flex items-center gap-0.5">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="text-zinc-400 hover:text-zinc-700 disabled:opacity-30 dark:hover:text-zinc-200"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === steps.length - 1}
                      className="text-zinc-400 hover:text-zinc-700 disabled:opacity-30 dark:hover:text-zinc-200"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => removeStep(i)}
                      className="text-zinc-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {s.type === 'message' && (
                  <textarea
                    value={s.text}
                    onChange={(e) => patchStep(i, { text: e.target.value })}
                    rows={2}
                    placeholder="Mensagem enviada ao cliente…"
                    className="w-full resize-y rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                )}

                {s.type === 'wait' && (
                  <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                    Aguardar
                    <input
                      type="number"
                      min={0}
                      value={s.delayMinutes}
                      onChange={(e) =>
                        patchStep(i, { delayMinutes: Number(e.target.value) })
                      }
                      className="w-20 rounded border border-zinc-300 px-1.5 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                    />
                    minutos ({fmtDelay(s.delayMinutes)}) antes do próximo passo
                  </div>
                )}

                {s.type === 'action' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={s.action}
                      onChange={(e) =>
                        patchStep(i, {
                          action: e.target.value as 'tag' | 'move_stage' | 'close',
                        })
                      }
                      className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      <option value="tag">Aplicar tag</option>
                      <option value="move_stage">Mover etapa</option>
                      <option value="close">Encerrar conversa</option>
                    </select>
                    {s.action !== 'close' && (
                      <input
                        value={s.value ?? ''}
                        onChange={(e) => patchStep(i, { value: e.target.value })}
                        placeholder={
                          s.action === 'tag'
                            ? 'Nome da tag'
                            : 'ID da etapa (card stage)'
                        }
                        className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            onClick={() => addStep('message')}
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <MessageSquare className="h-3.5 w-3.5" /> Mensagem
          </button>
          <button
            onClick={() => addStep('wait')}
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Clock className="h-3.5 w-3.5" /> Esperar
          </button>
          <button
            onClick={() => addStep('action')}
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Zap className="h-3.5 w-3.5" /> Ação
          </button>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={save.isPending}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || !name.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
