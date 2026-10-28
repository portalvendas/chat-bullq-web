'use client';

/**
 * Auditoria de Funil — roda sozinha seg–sáb às 08:30, 12:30 e 16:30 (e sob
 * demanda). Duas visões:
 *  - Alertas do processo: checagens SQL (cliente esperando, lead novo sem
 *    contato, orçamento sem follow-up, card sem conversa/parado/sem vendedora,
 *    conversa fora do funil, vendedora divergente, duplicado).
 *  - Sugestões de etapa: regras + IA sugerem mover o card (aplicar/ignorar).
 */
import { useEffect, useState } from 'react';
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
  Clock,
  Kanban,
  Users,
} from 'lucide-react';
import {
  funnelAuditService,
  type AuditSuggestion,
  type AuditFinding,
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
  const [view, setView] = useState<'alertas' | 'sugestoes'>('alertas');
  useEffect(() => {
    // ?tab=sugestoes abre direto nas sugestões (link de notificação usa alertas).
    if (new URLSearchParams(window.location.search).get('tab') === 'sugestoes') setView('sugestoes');
  }, []);
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
    <div className="h-full overflow-y-auto mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <ScanSearch className="h-6 w-6 text-primary" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Auditoria de Funil
          </h1>
          <p className="text-xs text-zinc-500">
            Roda sozinha seg–sáb às 08:30, 12:30 e 16:30 e avisa cada vendedora
            do que é dela. Sugestões de etapa só mudam o card se você aplicar.
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
              {run.findings != null && (
                <span className="font-semibold">{run.findings} alertas</span>
              )}
              {run.finishedAt && (
                <span className="text-xs text-zinc-400">
                  {new Date(run.finishedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
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

      {/* Visões */}
      {run && (
        <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
          {([
            ['alertas', 'Alertas do processo'],
            ['sugestoes', 'Sugestões de etapa'],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setView(k)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                view === k
                  ? 'border-primary text-primary'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {view === 'alertas' && run && <FindingsPanel runId={run.status === 'DONE' ? run.id : undefined} />}

      {/* Filtros de status */}
      {view === 'sugestoes' && run?.status === 'DONE' && (
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
      {view === 'sugestoes' && run?.status === 'DONE' &&
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
            {s.lead.conversationId ? (
              <Link
                href={`/inbox?conversationId=${s.lead.conversationId}`}
                title="Abrir a conversa do cliente no inbox"
                className="truncate text-sm font-semibold text-zinc-800 hover:text-primary hover:underline dark:text-zinc-100"
              >
                {s.lead.name || s.lead.title || 'Lead'}
              </Link>
            ) : (
              <span className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {s.lead.name || s.lead.title || 'Lead'}
              </span>
            )}
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
            {s.lead.conversationId ? (
              <Link
                href={`/inbox?conversationId=${s.lead.conversationId}`}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                <MessageSquare className="h-3 w-3" /> Ver conversa
              </Link>
            ) : (
              <span
                title="O cliente ainda não tem conversa no WhatsApp/Instagram"
                className="inline-flex items-center gap-1 text-[11px] text-zinc-400"
              >
                <MessageSquare className="h-3 w-3" /> Sem conversa
              </span>
            )}
            <Link
              href={`/pipelines/${s.pipelineId}`}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:underline"
            >
              <Kanban className="h-3 w-3" /> Abrir funil
            </Link>

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

// ── Alertas do processo ─────────────────────────────────────────────

function fmtMin(m: number | null): string {
  if (m == null) return '';
  if (m < 60) return `${m} min`;
  if (m < 1440) return `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`;
  const d = Math.floor(m / 1440);
  return `${d} dia${d > 1 ? 's' : ''}`;
}

const SEV: Record<string, { label: string; cls: string }> = {
  HIGH: { label: 'urgente', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  MEDIUM: { label: 'atenção', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  LOW: { label: 'baixa', cls: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300' },
};

/** Texto curto explicando o porquê, a partir de `details`. */
function findingHint(f: AuditFinding): string {
  const d = f.details ?? {};
  switch (f.type) {
    case 'AGUARDANDO_RESPOSTA':
      return (d.posVenda ? 'Pós-venda (já comprou) · ' : '') + (d.kind === 'apos_robo'
        ? 'Só o robô respondeu — falta a vendedora'
        : d.kind === 'nunca_respondido'
          ? 'Nunca respondido'
          : 'Cliente mandou mensagem e aguarda');
    case 'LEAD_NOVO_SEM_CONTATO':
      return d.soRobo ? 'Só o robô falou com o lead' : 'Ninguém falou com o lead ainda';
    case 'ORCAMENTO_SEM_FOLLOWUP':
      return `Orçamento ${d.orcamento ?? ''}${d.valor ? ` · ${brl(Number(d.valor))}` : ''} sem retorno`;
    case 'CARD_SEM_CONVERSA':
      return `Origem: ${d.origem ?? '—'} · iniciar conversa no WhatsApp`;
    case 'CARD_PARADO':
      return `Sem movimento na etapa ${d.etapa ?? ''}`;
    case 'CONVERSA_SEM_CARD':
      return `Cliente falou no ${d.canal ?? 'canal'} e não há card aberto`;
    case 'VENDEDOR_DIVERGENTE':
      return `Card: ${d.vendedoraCard ?? '—'} · Conversa: ${d.vendedoraConversa ?? '—'}`;
    case 'LEAD_DUPLICADO':
      return `${d.cardsAbertos ?? 2} cards abertos para o mesmo cliente`;
    case 'CARD_SEM_VENDEDOR':
      return 'Distribua para uma vendedora';
    default:
      return '';
  }
}

function FindingsPanel({ runId }: { runId?: string }) {
  const [type, setType] = useState<string | undefined>();
  const [owner, setOwner] = useState<string | undefined>();
  const [pageN, setPageN] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['funnel-audit', 'findings', runId, type, owner, pageN],
    queryFn: () =>
      funnelAuditService.findings({ runId, type, ownerUserId: owner, page: pageN, limit: 50 }),
    staleTime: 15_000,
  });

  if (isLoading)
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" /> carregando…
      </div>
    );
  if (!data || !data.runId)
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
        Ainda não há alertas — aparecem após a próxima auditoria.
      </div>
    );

  const total = data.summary.byType.reduce((a, t) => a + t.count, 0);
  const chip = (on: boolean) =>
    `rounded-lg border px-2.5 py-1.5 text-left text-xs ${
      on
        ? 'border-primary bg-primary/10 text-primary'
        : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
    }`;

  return (
    <div className="space-y-3">
      {/* Resumo por tipo */}
      <div className="flex flex-wrap gap-1.5">
        <button className={chip(!type)} onClick={() => { setType(undefined); setPageN(1); }}>
          <span className="font-semibold">{total}</span> todos
        </button>
        {data.summary.byType.map((t) => (
          <button
            key={t.type}
            className={chip(type === t.type)}
            onClick={() => { setType(type === t.type ? undefined : t.type); setPageN(1); }}
          >
            <span className="font-semibold">{t.count}</span> {t.label}
            {t.high > 0 && <span className="ml-1 font-semibold text-red-600">· {t.high} urgente</span>}
          </button>
        ))}
      </div>

      {/* Por vendedora */}
      {data.summary.bySeller.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Users className="h-3.5 w-3.5 text-zinc-400" />
          <button
            onClick={() => { setOwner(undefined); setPageN(1); }}
            className={`rounded-full px-2.5 py-1 ${!owner ? 'bg-primary text-white' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}
          >
            Todas
          </button>
          {data.summary.bySeller.filter((s) => s.userId).map((s) => (
            <button
              key={s.userId!}
              onClick={() => { setOwner(owner === s.userId ? undefined : s.userId!); setPageN(1); }}
              className={`rounded-full px-2.5 py-1 ${owner === s.userId ? 'bg-primary text-white' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}
            >
              {s.name} · {s.count}
            </button>
          ))}
        </div>
      )}

      {data.items.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          Nenhum alerta. 🎉
        </div>
      ) : (
        <ul className="space-y-2">
          {data.items.map((f) => {
            const sev = SEV[f.severity] ?? SEV.LOW;
            return (
              <li key={f.id} className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                        {f.lead.name || f.lead.phone || 'Lead'}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${sev.cls}`}>{sev.label}</span>
                      <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">{f.label}</span>
                      {f.minutes != null && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                          <Clock className="h-3 w-3" /> {fmtMin(f.minutes)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{findingHint(f)}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-500">
                      <span>{f.owner?.name ?? 'Sem vendedora'}</span>
                      {f.pipeline && <span className="text-zinc-400">{f.pipeline}{f.stage ? ` · ${f.stage}` : ''}</span>}
                      {f.lead.phone && <span className="tabular-nums text-zinc-400">{f.lead.phone}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {f.conversationId && (
                      <Link
                        href={`/inbox?conversationId=${f.conversationId}`}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                      >
                        <MessageSquare className="h-3 w-3" /> Abrir conversa
                      </Link>
                    )}
                    {f.pipelineId && (
                      <Link
                        href={`/pipelines/${f.pipelineId}`}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:underline"
                      >
                        <Kanban className="h-3 w-3" /> Abrir funil
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-xs text-zinc-500">
          <button disabled={pageN <= 1} onClick={() => setPageN((p) => p - 1)} className="disabled:opacity-40">‹ anterior</button>
          <span>{pageN} / {data.pagination.totalPages}</span>
          <button disabled={pageN >= data.pagination.totalPages} onClick={() => setPageN((p) => p + 1)} className="disabled:opacity-40">próxima ›</button>
        </div>
      )}
    </div>
  );
}
