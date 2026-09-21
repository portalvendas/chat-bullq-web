'use client';

/**
 * Construtor de disparo: canal + template aprovado + variáveis + audiência
 * (funil/etapa/tags ANY/ALL) + estimativa ao vivo + checagem de teto → dispara.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Megaphone, Send } from 'lucide-react';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import { tagsService } from '@/features/settings/services/tags.service';
import {
  disparosService,
  fmtBRL,
  type AudienceFilter,
  type MessageCategory,
} from '@/features/disparos/services/disparos.service';

const inputCls =
  'w-full rounded-lg border border-zinc-300 bg-transparent px-2.5 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800';

const CONTACT_FIELDS = [
  { value: 'firstName', label: 'Primeiro nome' },
  { value: 'name', label: 'Nome completo' },
  { value: 'phone', label: 'Telefone' },
  { value: 'email', label: 'E-mail' },
];

export default function NovoDisparoPage() {
  const router = useRouter();

  const { data: channels } = useQuery({
    queryKey: ['disparos', 'wa-channels'],
    queryFn: () => pipelinesService.listWhatsappChannels(),
    staleTime: 60_000,
  });
  const oficiais = useMemo(
    () => (channels ?? []).filter((c) => c.type === 'WHATSAPP_OFFICIAL'),
    [channels],
  );
  const { data: pipelines } = useQuery({
    queryKey: ['pipelines', 'active'],
    queryFn: () => pipelinesService.list(false),
    staleTime: 60_000,
  });
  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsService.list(),
    staleTime: 60_000,
  });

  const [name, setName] = useState('');
  const [channelId, setChannelId] = useState('');
  useEffect(() => {
    if (!channelId && oficiais.length) setChannelId(oficiais[0].id);
  }, [oficiais, channelId]);

  const { data: templates } = useQuery({
    queryKey: ['disparos', 'templates', channelId],
    queryFn: () => disparosService.templates(),
    enabled: !!channelId,
    staleTime: 60_000,
  });
  const [templateName, setTemplateName] = useState('');
  const template = useMemo(
    () => (templates ?? []).find((t) => t.name === templateName),
    [templates, templateName],
  );

  // Detecta variáveis {{n}} no corpo do template.
  const varCount = useMemo(() => {
    if (!template?.bodyText) return 0;
    const m = template.bodyText.match(/\{\{\s*\d+\s*\}\}/g);
    return m ? new Set(m).size : 0;
  }, [template]);
  const [mapping, setMapping] = useState<Record<string, { type: string; value: string }>>({});

  // Audiência
  const [pipelineId, setPipelineId] = useState('');
  const [stageId, setStageId] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [tagMatch, setTagMatch] = useState<'ANY' | 'ALL'>('ANY');
  const stages = useMemo(
    () => pipelines?.find((p) => p.id === pipelineId)?.stages ?? [],
    [pipelines, pipelineId],
  );
  const filter: AudienceFilter = useMemo(
    () => ({
      pipelineId: pipelineId || undefined,
      stageId: stageId || undefined,
      tagIds: tagIds.length ? tagIds : undefined,
      tagMatch,
      excludeOptedOut: true,
    }),
    [pipelineId, stageId, tagIds, tagMatch],
  );
  const hasSelector = !!(pipelineId || stageId || tagIds.length);

  // Estimativa ao vivo (debounce simples via query key)
  const category: MessageCategory = template?.category ?? 'MARKETING';
  const { data: estimate, isFetching: estimating } = useQuery({
    queryKey: ['disparos', 'estimate', filter, category, hasSelector],
    queryFn: () =>
      disparosService.estimate({ audienceFilter: filter, templateCategory: category }),
    enabled: hasSelector && !!template,
    staleTime: 10_000,
  });

  const create = useMutation({
    mutationFn: async (start: boolean) => {
      if (!name.trim()) throw new Error('Dê um nome ao disparo.');
      if (!channelId) throw new Error('Escolha o canal.');
      if (!template) throw new Error('Escolha um template aprovado.');
      if (!hasSelector) throw new Error('Defina a audiência.');
      const variablesMapping: Record<string, any> = {};
      for (let i = 1; i <= varCount; i++) {
        variablesMapping[i] = mapping[i] ?? { type: 'contactField', value: 'firstName' };
      }
      const b = await disparosService.create({
        channelId,
        name: name.trim(),
        templateName: template.name,
        templateLanguage: template.language,
        templateCategory: template.category,
        variablesMapping,
        audienceFilter: filter,
      });
      if (start) await disparosService.action(b.id, 'start');
      return b.id;
    },
    onSuccess: (id) => {
      toast.success('Disparo criado');
      router.push(`/disparos/${id}`);
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || e?.message || 'Falha'),
  });

  const overBudget = estimate && estimate.budget.hasCap && !estimate.budget.withinBudget;

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Megaphone className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Novo disparo
        </h1>
      </div>

      <Field label="Nome da campanha">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Promoção de setembro"
          className={inputCls}
        />
      </Field>

      <Field label="Canal (WhatsApp Oficial)">
        <select value={channelId} onChange={(e) => setChannelId(e.target.value)} className={inputCls}>
          <option value="">Selecione…</option>
          {oficiais.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {oficiais.length === 0 && (
          <p className="mt-1 text-[11px] text-amber-600">
            Nenhum canal WhatsApp Oficial conectado.
          </p>
        )}
      </Field>

      <Field label="Template aprovado">
        <select value={templateName} onChange={(e) => setTemplateName(e.target.value)} className={inputCls}>
          <option value="">Selecione…</option>
          {(templates ?? []).map((t) => (
            <option key={t.id} value={t.name}>
              {t.name} · {t.category} · {t.language}
            </option>
          ))}
        </select>
        {template && (
          <p className="mt-1 whitespace-pre-wrap rounded-md bg-zinc-50 p-2 text-xs text-zinc-500 dark:bg-zinc-800/50">
            {template.bodyText}
          </p>
        )}
      </Field>

      {varCount > 0 && (
        <Field label="Variáveis do template">
          <div className="space-y-2">
            {Array.from({ length: varCount }, (_, i) => i + 1).map((n) => {
              const cur = mapping[n] ?? { type: 'contactField', value: 'firstName' };
              return (
                <div key={n} className="flex items-center gap-2">
                  <span className="w-8 text-xs font-bold text-zinc-400">{`{{${n}}}`}</span>
                  <select
                    value={cur.type === 'static' ? '__static' : cur.value}
                    onChange={(e) => {
                      const v = e.target.value;
                      setMapping((m) => ({
                        ...m,
                        [n]: v === '__static' ? { type: 'static', value: '' } : { type: 'contactField', value: v },
                      }));
                    }}
                    className={`${inputCls} flex-1`}
                  >
                    {CONTACT_FIELDS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                    <option value="__static">Texto fixo…</option>
                  </select>
                  {cur.type === 'static' && (
                    <input
                      value={cur.value}
                      onChange={(e) =>
                        setMapping((m) => ({ ...m, [n]: { type: 'static', value: e.target.value } }))
                      }
                      placeholder="texto"
                      className={`${inputCls} flex-1`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </Field>
      )}

      <Field label="Audiência">
        <div className="grid grid-cols-2 gap-2">
          <select value={pipelineId} onChange={(e) => { setPipelineId(e.target.value); setStageId(''); }} className={inputCls}>
            <option value="">Qualquer funil</option>
            {(pipelines ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select value={stageId} onChange={(e) => setStageId(e.target.value)} className={inputCls} disabled={!pipelineId}>
            <option value="">Qualquer etapa</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="mt-2">
          <div className="mb-1 flex items-center gap-2 text-[11px] text-zinc-400">
            <span>Tags</span>
            <button type="button" onClick={() => setTagMatch(tagMatch === 'ANY' ? 'ALL' : 'ANY')} className="rounded border border-zinc-300 px-1.5 py-0.5 dark:border-zinc-700">
              {tagMatch === 'ANY' ? 'qualquer (ANY)' : 'todas (ALL)'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(tags ?? []).map((t) => {
              const on = tagIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTagIds((prev) => on ? prev.filter((x) => x !== t.id) : [...prev, t.id])}
                  className={`rounded-full border px-2 py-0.5 text-[11px] ${on ? 'border-primary bg-primary/10 text-primary' : 'border-zinc-300 text-zinc-500 dark:border-zinc-700'}`}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>
        {!hasSelector && (
          <p className="mt-1 text-[11px] text-amber-600">
            Selecione ao menos um funil, etapa ou tag.
          </p>
        )}
      </Field>

      {/* Estimativa ao vivo */}
      <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Estimativa {estimating && <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />}
          </span>
          <span className="text-xs text-zinc-400">teto (real reconcilia por entrega)</span>
        </div>
        {estimate ? (
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <Stat label="Destinatários" value={String(estimate.recipients)} />
            <Stat label="Por msg" value={fmtBRL(estimate.unitMicros)} />
            <Stat label="Total (teto)" value={fmtBRL(estimate.estimatedTotalMicros)} />
          </div>
        ) : (
          <p className="mt-2 text-xs text-zinc-400">Defina audiência e template.</p>
        )}
        {overBudget && (
          <p className="mt-2 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/20">
            Estimativa acima do teto disponível ({fmtBRL(estimate!.budget.availableMicros)}).
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => create.mutate(true)}
          disabled={create.isPending || !!overBudget}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Criar e disparar
        </button>
        <button
          onClick={() => create.mutate(false)}
          disabled={create.isPending}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200"
        >
          Salvar rascunho
        </button>
      </div>

    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </label>
      {children}
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 py-2 dark:bg-zinc-800/50">
      <div className="text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">{value}</div>
      <div className="text-[10px] uppercase text-zinc-400">{label}</div>
    </div>
  );
}
