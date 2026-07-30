'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Route, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  pipelinesService,
  type Pipeline,
  type LeadRouting,
  type RoutingException,
  type RoutingTarget,
} from '@/features/pipelines/services/pipelines.service';

const TYPE_LABEL: Record<string, string> = {
  MERCADO_LIVRE: 'Mercado Livre',
  SHOPEE: 'Shopee',
  WHATSAPP: 'WhatsApp',
  INSTAGRAM: 'Instagram',
  TELEGRAM: 'Telegram',
  LANDING_PAGE: 'Landing Page',
  FACEBOOK_LEADADS: 'Facebook Lead Ads',
};

const KIND_LABEL: Record<RoutingException['kind'], string> = {
  CHANNEL: 'Canal específico',
  LEADADS_PAGE: 'Página Lead Ads',
  UTM_SOURCE: 'utm_source',
};

const selCls =
  'rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';

/** Dois selects: Funil + Etapa. pipelineId vazio = "usar padrão". */
function TargetPicker({
  pipelines,
  value,
  onChange,
}: {
  pipelines: Pipeline[];
  value: RoutingTarget;
  onChange: (t: RoutingTarget) => void;
}) {
  const stages = pipelines.find((p) => p.id === value.pipelineId)?.stages ?? [];
  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={value.pipelineId ?? ''}
        onChange={(e) => onChange({ pipelineId: e.target.value, stageId: null })}
        className={selCls}
      >
        <option value="">Usar padrão</option>
        {pipelines.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <select
        value={value.stageId ?? ''}
        onChange={(e) =>
          onChange({ ...value, stageId: e.target.value || null })
        }
        disabled={!value.pipelineId}
        className={`${selCls} disabled:opacity-50`}
      >
        <option value="">1ª etapa (entrada)</option>
        {stages.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function LeadRoutingPage() {
  const router = useRouter();
  const [byType, setByType] = useState<Record<string, RoutingTarget>>({});
  const [exceptions, setExceptions] = useState<RoutingException[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: pipelines = [] } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => pipelinesService.list(false),
  });
  const { data: routing } = useQuery({
    queryKey: ['lead-routing'],
    queryFn: () => pipelinesService.getRouting(),
  });
  const { data: options } = useQuery({
    queryKey: ['lead-routing-options'],
    queryFn: () => pipelinesService.getRoutingOptions(),
  });

  useEffect(() => {
    if (routing) {
      setByType(routing.byType ?? {});
      setExceptions(routing.exceptions ?? []);
    }
  }, [routing]);

  const types = useMemo(
    () => options?.types ?? Object.keys(TYPE_LABEL),
    [options],
  );

  const setType = (t: string, target: RoutingTarget) => {
    setByType((prev) => {
      const next = { ...prev };
      if (!target.pipelineId) delete next[t];
      else next[t] = target;
      return next;
    });
  };

  const addException = () =>
    setExceptions((prev) => [
      ...prev,
      { kind: 'CHANNEL', value: '', pipelineId: '', stageId: null },
    ]);
  const updateException = (i: number, patch: Partial<RoutingException>) =>
    setExceptions((prev) =>
      prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)),
    );
  const removeException = (i: number) =>
    setExceptions((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: LeadRouting = {
        byType: Object.fromEntries(
          Object.entries(byType).filter(([, t]) => t.pipelineId),
        ),
        exceptions: exceptions.filter((e) => e.kind && e.value && e.pipelineId),
      };
      await pipelinesService.saveRouting(payload);
      toast.success('Roteamento salvo');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/pipelines')}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Route className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Roteamento de origens
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Defina para qual funil (e etapa) cada origem de lead deve entrar.
            Sem regra, o lead cai no funil padrão.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>

      {/* Por tipo de origem */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          Por tipo de origem
        </h2>
        <div className="mt-3 space-y-2">
          {types.map((t) => (
            <div
              key={t}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {TYPE_LABEL[t] ?? t}
              </span>
              <TargetPicker
                pipelines={pipelines}
                value={byType[t] ?? { pipelineId: '', stageId: null }}
                onChange={(target) => setType(t, target)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Exceções por conta */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            Exceções (por conta / página / utm_source)
          </h2>
          <button
            onClick={addException}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar exceção
          </button>
        </div>
        <p className="mt-1 text-xs text-zinc-400">
          Exceções têm prioridade sobre a regra por tipo.
        </p>

        <div className="mt-3 space-y-2">
          {exceptions.length === 0 && (
            <p className="rounded-lg border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-400 dark:border-zinc-800">
              Nenhuma exceção. Use quando uma conta específica deve ir pra um
              funil diferente do tipo dela.
            </p>
          )}
          {exceptions.map((ex, i) => (
            <div
              key={ex.id ?? i}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <select
                value={ex.kind}
                onChange={(e) =>
                  updateException(i, {
                    kind: e.target.value as RoutingException['kind'],
                    value: '',
                  })
                }
                className={selCls}
              >
                {(
                  Object.keys(KIND_LABEL) as RoutingException['kind'][]
                ).map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>

              {ex.kind === 'CHANNEL' && (
                <select
                  value={ex.value}
                  onChange={(e) => updateException(i, { value: e.target.value })}
                  className={selCls}
                >
                  <option value="">Escolha o canal…</option>
                  {(options?.channels ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              )}
              {ex.kind === 'LEADADS_PAGE' && (
                <select
                  value={ex.value}
                  onChange={(e) => updateException(i, { value: e.target.value })}
                  className={selCls}
                >
                  <option value="">Escolha a página…</option>
                  {(options?.leadAdsPages ?? []).map((p) => (
                    <option key={p.pageId} value={p.pageId}>
                      {p.pageName || p.pageId}
                    </option>
                  ))}
                </select>
              )}
              {ex.kind === 'UTM_SOURCE' && (
                <input
                  value={ex.value}
                  onChange={(e) => updateException(i, { value: e.target.value })}
                  placeholder="ex: MetaAds"
                  className={selCls}
                />
              )}

              <span className="text-xs text-zinc-400">→</span>
              <TargetPicker
                pipelines={pipelines}
                value={{ pipelineId: ex.pipelineId, stageId: ex.stageId }}
                onChange={(t) =>
                  updateException(i, {
                    pipelineId: t.pipelineId,
                    stageId: t.stageId,
                  })
                }
              />
              <button
                onClick={() => removeException(i)}
                className="ml-auto rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500"
                aria-label="Remover"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
