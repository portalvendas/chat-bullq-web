'use client';

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Timer, Plus, Trash2, Loader2, GripVertical, X } from 'lucide-react';
import {
  cadencesService,
  type Cadence,
  type CadenceStep,
} from '@/features/cadences/services/cadences.service';

function fmtDelay(min: number): string {
  if (min < 60) return `${min}min`;
  if (min < 1440) return `${Math.round((min / 60) * 10) / 10}h`;
  return `${Math.round((min / 1440) * 10) / 10}d`;
}

export default function CadencesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Cadence | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: cadences = [], isLoading } = useQuery({
    queryKey: ['cadences'],
    queryFn: () => cadencesService.list(),
    staleTime: 10_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['cadences'] });

  const remove = useMutation({
    mutationFn: (id: string) => cadencesService.remove(id),
    onSuccess: () => {
      toast.success('Cadência removida');
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
        name: 'Follow-up de orçamento (Kommo)',
        triggerType: 'MANUAL',
        stopOnReply: true,
        steps: [
          { delayMinutes: 60, text: 'Oie! Consegue conversar agora ou prefere outro momento?' },
          { delayMinutes: 180, text: 'Imagino que a rotina esteja corrida. Fiquei aguardando sua confirmação para seguir com seu orçamento. Me avisa quando puder!' },
          { delayMinutes: 180, text: 'Oi, eu de novo 😊 se confirmando nas próximas horas, consigo colocar seu pedido em produção ainda hoje. Me avisa para garantir.' },
          { delayMinutes: 1200, text: 'Oi😊 Estamos com uma condição especial hoje e consigo aplicar diretamente na sua proposta. Posso seguir com o seu orçamento?' },
        ],
        onEnd: { tagName: 'NÃO RESPONDEU', close: true },
      }),
    onSuccess: () => {
      toast.success('Cadência de exemplo criada (Follow-up de orçamento).');
      invalidate();
    },
    onError: () => toast.error('Erro ao criar exemplo'),
  });

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-4 flex items-center gap-2">
        <Timer className="h-5 w-5 text-zinc-500" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Cadências (follow-up)
          </h1>
          <p className="text-xs text-zinc-500">
            Réguas de reengajamento: mensagens em sequência com atraso, que param
            quando o cliente responde.
          </p>
        </div>
        {cadences.length === 0 && (
          <button
            onClick={() => seedFollowup.mutate()}
            disabled={seedFollowup.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {seedFollowup.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            Follow-up de exemplo
          </button>
        )}
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> Nova cadência
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : cadences.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 px-8 py-16 text-center dark:border-zinc-800">
          <Timer className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-500">
            Nenhuma cadência ainda. Crie a primeira (ex: Follow-up de orçamento).
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {cadences.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <button
                onClick={() => toggle.mutate(c)}
                title={c.active ? 'Ativa' : 'Pausada'}
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
                    ? `tag: ${c.triggerValue ?? '—'}`
                    : 'manual'}{' '}
                  · {c.steps.length} passo(s) ·{' '}
                  {c.stopOnReply ? 'para na resposta' : 'não para'} ·{' '}
                  {c._count?.runs ?? 0} disparos
                </div>
              </button>
              <button
                onClick={() =>
                  confirm(`Remover a cadência "${c.name}"?`) && remove.mutate(c.id)
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
        <CadenceEditor
          cadence={editing}
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

function CadenceEditor({
  cadence,
  onClose,
  onSaved,
}: {
  cadence: Cadence | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(cadence?.name ?? '');
  const [triggerType, setTriggerType] = useState<'MANUAL' | 'TAG_ADDED'>(
    cadence?.triggerType ?? 'MANUAL',
  );
  const [triggerValue, setTriggerValue] = useState(cadence?.triggerValue ?? '');
  const [stopOnReply, setStopOnReply] = useState(cadence?.stopOnReply ?? true);
  const [steps, setSteps] = useState<CadenceStep[]>(
    cadence?.steps?.length ? cadence.steps : [{ delayMinutes: 60, text: '' }],
  );
  const [closeOnEnd, setCloseOnEnd] = useState(cadence?.onEnd?.close ?? false);
  const [endTag, setEndTag] = useState(cadence?.onEnd?.tagName ?? '');

  const save = useMutation({
    mutationFn: () => {
      const dto = {
        name: name.trim(),
        triggerType,
        triggerValue: triggerType === 'TAG_ADDED' ? triggerValue.trim() : null,
        stopOnReply,
        steps: steps
          .filter((s) => s.text.trim())
          .map((s) => ({
            delayMinutes: Number(s.delayMinutes) || 0,
            text: s.text.trim(),
          })),
        onEnd: {
          close: closeOnEnd,
          ...(endTag.trim() ? { tagName: endTag.trim() } : {}),
        },
      };
      return cadence
        ? cadencesService.update(cadence.id, dto)
        : cadencesService.create(dto);
    },
    onSuccess: () => {
      toast.success(cadence ? 'Cadência atualizada' : 'Cadência criada');
      onSaved();
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  const setStep = (i: number, patch: Partial<CadenceStep>) =>
    setSteps((arr) => arr.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

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
            {cadence ? 'Editar cadência' : 'Nova cadência'}
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
          Disparo
        </label>
        <div className="mb-3 mt-1 flex flex-wrap items-center gap-2">
          <select
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value as 'MANUAL' | 'TAG_ADDED')}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="MANUAL">Manual</option>
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
          Parar a régua quando o cliente responder
        </label>

        <div className="mt-3 mb-1 text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
          Passos (em ordem)
        </div>
        <div className="space-y-2">
          {steps.map((s, i) => (
            <div
              key={i}
              className="rounded-lg border border-zinc-200 p-2 dark:border-zinc-800"
            >
              <div className="mb-1 flex items-center gap-2 text-[11px] text-zinc-500">
                <GripVertical className="h-3.5 w-3.5" />
                Enviar após
                <input
                  type="number"
                  min={0}
                  value={s.delayMinutes}
                  onChange={(e) =>
                    setStep(i, { delayMinutes: Number(e.target.value) })
                  }
                  className="w-16 rounded border border-zinc-300 px-1.5 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                />
                min ({fmtDelay(s.delayMinutes)})
                <button
                  onClick={() => setSteps((a) => a.filter((_, idx) => idx !== i))}
                  className="ml-auto text-zinc-400 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <textarea
                value={s.text}
                onChange={(e) => setStep(i, { text: e.target.value })}
                rows={2}
                placeholder="Mensagem…"
                className="w-full resize-y rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
          ))}
        </div>
        <button
          onClick={() =>
            setSteps((a) => [...a, { delayMinutes: 1440, text: '' }])
          }
          className="mt-2 inline-flex items-center gap-1 rounded-md border border-dashed border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar passo
        </button>

        <div className="mt-4 mb-1 text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
          Ao terminar sem resposta
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={endTag}
            onChange={(e) => setEndTag(e.target.value)}
            placeholder="Aplicar tag (ex: NÃO RESPONDEU)"
            className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={closeOnEnd}
              onChange={(e) => setCloseOnEnd(e.target.checked)}
            />
            Fechar conversa
          </label>
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
