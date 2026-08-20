'use client';

/**
 * Auditoria de Funil — varre os cards OPEN ativos nos últimos 60 dias e sugere
 * mudança de etapa (híbrido: regras filtram, IA analisa). Revisão manual:
 * aplicar move o card; ignorar descarta; "Salesbot" inicia um fluxo no card.
 * Dá pra escolher quais funis analisar antes de rodar.
 */
import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ScanSearch,
  Loader2,
  RefreshCw,
  ArrowRight,
  Check,
  X,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Bot,
  ChevronDown,
} from 'lucide-react';
import {
  funnelAuditService,
  type AuditSuggestion,
} from '@/features/funnel-audit/services/funnel-audit.service';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import {
  chatbotService,
  type ChatbotFlow,
} from '@/features/chatbot/services/chatbot.service';

function brl(v: number | null): string {
  if (v == null) return '';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const STATUS_TABS = [
  { key: 'PENDING', label: 'Pendentes' },
  { key: 'APPLIED', label: 'Aplicadas' },
  { key: 'DISMISSED', label: 'Ignoradas' },
] as const;

function actionBadge(action: string): { label: string; cls: string } {
  switch (action) {
    case 'ADVANCE':
      return { label: 'Avançar', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' };
    case 'REGRESS':
      return { label: 'Retroceder', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' };
    case 'WON':
      return { label: 'Ganho', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' };
    case 'LOST':
      return { label: 'Perdido', cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' };
    default:
      return { label: 'Manter', cls: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300' };
  }
}
function confBadge(c: string): { label: string; cls: string } {
  if (c === 'HIGH') return { label: 'alta', cls: 'text-emerald-600' };
  if (c === 'LOW') return { label: 'baixa', cls: 'text-zinc-400' };
  return { label: 'média', cls: 'text-amber-600' };
}

export default function FunnelAuditPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>('PENDING');
  const [selectedPipes, setSelectedPipes] = useState<string[]>([]);

  const { data: pipelines } = useQuery({
    queryKey: ['pipelines', 'list'],
    queryFn: () => pipelinesService.list(false),
    staleTime: 60_000,
  });

  const { data: bots } = useQuery({
    queryKey: ['chatbot', 'flows'],
    queryFn: () => chatbotService.list(),
    staleTime: 60_000,
  });
  const activeBots = (bots ?? []).filter((b) => b.isActive);

  const { data: run } = useQuery({
    queryKey: ['funnel-audit', 'latest'],
    queryFn: () => funnelAuditService.latest(),
    refetchInterval: (q) =>
      (q.state.data as any)?.status === 'RUNNING' ? 4000 : false,
  });
  const running = run?.status === 'RUNNING';

  const { data: page, isLoading } = useQuery({
    queryKey: ['funnel-audit', 'suggestions', run?.id, status],
    queryFn: () => funnelAuditService.suggestions({ runId: run?.id, status }),
    enabled: !!run && run.status === 'DONE',
    staleTime: 15_000,
  });

  const runAudit = useMutation({
    mutationFn: () => funnelAuditService.run(selectedPipes),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['funnel-audit', 'latest'] });
      toast.success(
        r.alreadyRunning ? 'Auditoria já em andamento…' : 'Auditoria iniciada…',
      );
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'Falha ao iniciar auditoria'),
  });

  const apply = useMutation({
    mutationFn: (id: string) => funnelAuditService.apply(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['funnel-audit', 'suggestions'] });
      toast.success('Card movido para a etapa sugerida');
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'Não foi possível aplicar'),
  });
  const dismiss = useMutation({
    mutationFn: (id: string) => funnelAuditService.dismiss(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['funnel-audit', 'suggestions'] });
      toast.success('Sugestão ignorada');
    },
    onError: () => toast.error('Não foi possível ignorar'),
  });
  const startBot = useMutation({
    mutationFn: (v: { flowId: string; conversationId: string }) =>
      chatbotService.start(v.flowId, v.conversationId),
    onSuccess: (r) => toast.success(`Salesbot "${r.flowName}" iniciado no lead`),
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'Não foi possível iniciar o salesbot'),
  });

  const togglePipe = (id: string) =>
    setSelectedPipes((arr) =>
      arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id],
    );

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <ScanSearch className="h-6 w-6 text-primary" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Auditoria de Funil
          </h1>
          <p className="text-xs text-zinc-500">
            Analisa os cards ativos nos últimos 60 dias e sugere a etapa certa.
            Nada muda sem você aplicar.
          </p>
        </div>
        <button
          onClick={() => runAudit.mutate()}
          disabled={runAudit.isPending || running}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {runAudit.isPending || running ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {running ? 'Auditando…' : 'Auditar funil'}
        </button>
      </div>

      {/* Seletor de funis */}
      {pipelines && pipelines.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Funis a analisar
            </span>
            <span className="text-[11px] text-zinc-400">
              {selectedPipes.length === 0
                ? 'todos'
                : `${selectedPipes.length} selecionado(s)`}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {pipelines.map((p) => {
              const on =
                selectedPipes.length === 0 || selectedPipes.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => togglePipe(p.id)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    selectedPipes.includes(p.id)
                      ? 'bg-primary text-white'
                      : on
                        ? 'bg-primary/10 text-primary'
                        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'
                  }`}
                  title={
                    selectedPipes.length === 0
                      ? 'Todos os funis (clique para restringir)'
                      : undefined
                  }
                >
                  {p.name}
                </button>
              );
            })}
          </div>
          {selectedPipes.length > 0 && (
            <button
              onClick={() => setSelectedPipes([])}
              className="mt-2 text-[11px] text-zinc-400 hover:underline"
            >
              limpar seleção (analisar todos)
            </button>
          )}
        </div>
      )}

      {/* Status do run */}
      {run && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          {run.status === 'RUNNING' && (
            <span className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Analisando os cards… roda em segundo plano, pode levar alguns
              minutos.
            </span>
          )}
          {run.status === 'FAILED' && (
            <span className="inline-flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" /> Falhou: {run.error}
            </span>
          )}
          {run.status === 'DONE' && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-zinc-600 dark:text-zinc-300">
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> Concluída
              </span>
              <span>{run.cardsScanned} cards analisados</span>
              <span>{run.cardsFlagged} com sinal</span>
              <span className="font-semibold">{run.suggestions} sugestões</span>
              {run.aiUsed && (
                <span className="inline-flex items-center gap-1 text-violet-600">
                  <Sparkles className="h-3.5 w-3.5" /> com IA
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {!run && (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
          Nenhuma auditoria ainda. Escolha os funis (ou deixe todos) e clique em{' '}
          <b>Auditar funil</b>.
        </div>
      )}

      {/* Filtros de status */}
      {run?.status === 'DONE' && (
        <div className="flex gap-1.5">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setStatus(t.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                status === t.key
                  ? 'bg-primary text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Lista de sugestões */}
      {run?.status === 'DONE' &&
        (isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" /> carregando…
          </div>
        ) : !page || page.items.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
            Nenhuma sugestão {status === 'PENDING' ? 'pendente' : ''}. 🎉
          </div>
        ) : (
          <ul className="space-y-2">
            {page.items.map((s) => (
              <SuggestionRow
                key={s.id}
                s={s}
                bots={activeBots}
                busy={apply.isPending || dismiss.isPending}
                botBusy={startBot.isPending}
                onApply={() => apply.mutate(s.id)}
                onDismiss={() => dismiss.mutate(s.id)}
                onStartBot={(flowId) =>
                  s.lead.conversationId &&
                  startBot.mutate({
                    flowId,
                    conversationId: s.lead.conversationId,
                  })
                }
              />
            ))}
          </ul>
        ))}
    </div>
  );
}

function SuggestionRow({
  s,
  bots,
  busy,
  botBusy,
  onApply,
  onDismiss,
  onStartBot,
}: {
  s: AuditSuggestion;
  bots: ChatbotFlow[];
  busy: boolean;
  botBusy: boolean;
  onApply: () => void;
  onDismiss: () => void;
  onStartBot: (flowId: string) => void;
}) {
  const act = actionBadge(s.action);
  const conf = confBadge(s.confidence);
  const pending = s.status === 'PENDING';
  const [botOpen, setBotOpen] = useState(false);
  const canBot = !!s.lead.conversationId && bots.length > 0;

  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              {s.lead.name || s.lead.title || 'Lead'}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${act.cls}`}
            >
              {act.label}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400">
              {s.source === 'ai' ? (
                <>
                  <Sparkles className="h-3 w-3 text-violet-500" /> IA
                </>
              ) : (
                'regra'
              )}
              · confiança <span className={conf.cls}>{conf.label}</span>
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
            {s.pipelineName && (
              <span className="text-zinc-400">{s.pipelineName}:</span>
            )}
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">
              {s.currentStageName ?? '—'}
            </span>
            <ArrowRight className="h-3 w-3 text-zinc-400" />
            <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
              {s.suggestedStageName ?? '—'}
            </span>
            {s.lead.value != null && (
              <span className="ml-1 tabular-nums text-zinc-500">
                {brl(s.lead.value)}
              </span>
            )}
          </div>

          <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-300">
            {s.reason}
          </p>

          <div className="mt-1 flex items-center gap-3">
            {s.lead.conversationId && (
              <Link
                href={`/inbox?conversationId=${s.lead.conversationId}`}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                <MessageSquare className="h-3 w-3" /> Ver conversa
              </Link>
            )}

            {/* Salesbot */}
            <div className="relative">
              <button
                type="button"
                disabled={!canBot || botBusy}
                onClick={() => setBotOpen((o) => !o)}
                title={
                  !s.lead.conversationId
                    ? 'Lead sem conversa'
                    : bots.length === 0
                      ? 'Nenhum salesbot ativo'
                      : 'Iniciar um salesbot neste lead'
                }
                className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-600 hover:underline disabled:opacity-40 disabled:no-underline"
              >
                <Bot className="h-3 w-3" /> Salesbot
                <ChevronDown className="h-3 w-3" />
              </button>
              {botOpen && canBot && (
                <div className="absolute left-0 z-10 mt-1 w-56 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                  {bots.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setBotOpen(false);
                        onStartBot(b.id);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <Bot className="h-3.5 w-3.5 text-violet-500" />
                      <span className="truncate">{b.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {pending && (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={onApply}
              disabled={busy}
              title="Aplicar (move o card)"
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" /> Aplicar
            </button>
            <button
              onClick={onDismiss}
              disabled={busy}
              title="Ignorar"
              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <X className="h-3.5 w-3.5" /> Ignorar
            </button>
          </div>
        )}
        {!pending && (
          <span className="shrink-0 text-[11px] font-medium text-zinc-400">
            {s.status === 'APPLIED' ? 'aplicada' : 'ignorada'}
          </span>
        )}
      </div>
    </li>
  );
}
