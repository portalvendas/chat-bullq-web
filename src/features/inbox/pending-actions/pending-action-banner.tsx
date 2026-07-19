'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  Clock,
  Info,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useApprovePendingAction,
  useRegenerateAnswer,
  useRejectPendingAction,
} from './use-pending-actions';
import type {
  PendingAction,
  PendingActionImpact,
} from './types';

interface Props {
  action: PendingAction;
  /** Stagger index for the entrance animation (50ms steps). */
  index?: number;
}

interface ImpactStyle {
  card: string;
  badge: string;
  iconWrap: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const IMPACT_STYLES: Record<PendingActionImpact, ImpactStyle> = {
  low: {
    card: 'border-blue-300 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/30',
    badge:
      'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    iconWrap:
      'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300',
    Icon: Info,
  },
  medium: {
    card: 'border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30',
    badge:
      'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
    iconWrap:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    Icon: Info,
  },
  high: {
    card: 'border-orange-400 bg-orange-50 dark:border-orange-900/60 dark:bg-orange-950/30',
    badge:
      'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
    iconWrap:
      'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
    Icon: AlertTriangle,
  },
  critical: {
    card: 'border-red-400 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    iconWrap: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    Icon: AlertTriangle,
  },
};

const TOOL_LABELS: Record<string, string> = {
  grantAccess: 'Liberar acesso',
  resetPassword: 'Resetar senha',
  transferToHuman: 'Transferir para humano',
  replyToConversation: 'Resposta ao cliente',
};

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Expirado';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    return `${hours}h ${String(remMinutes).padStart(2, '0')}m`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Live countdown to `expiresAt`. Re-renders every second via local
 * state. We rebase on the prop in case the action gets refreshed with a
 * new expiration (rare but cheap to support).
 */
function useCountdown(expiresAt: string): number {
  const target = useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return Math.max(0, target - now);
}

export function PendingActionBanner({ action, index = 0 }: Props) {
  const style = IMPACT_STYLES[action.preview.impact] ?? IMPACT_STYLES.medium;
  const remainingMs = useCountdown(action.expiresAt);
  const expired = remainingMs <= 0;

  const approve = useApprovePendingAction();
  const reject = useRejectPendingAction();
  const regenerate = useRegenerateAnswer();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [showComplement, setShowComplement] = useState(false);
  const [complement, setComplement] = useState('');
  const [scope, setScope] = useState<'item' | 'store'>('item');

  // Resposta ao cliente é EDITÁVEL antes de aprovar — o operador pode
  // complementar/corrigir. O texto (original → editado) fica registrado no
  // pending action e serve de base de aprendizado.
  const isReply = action.toolName === 'replyToConversation';
  const [editedText, setEditedText] = useState(action.preview.action ?? '');
  const wasEdited = isReply && editedText.trim() !== (action.preview.action ?? '').trim();

  const isWorking = approve.isPending || reject.isPending;
  // Lock the buttons once the backend confirmed a terminal status.
  const isTerminal =
    action.status !== 'PENDING' || expired;

  const handleApprove = () => {
    if (isTerminal || isWorking) return;
    if (isReply && !editedText.trim()) {
      toast.error('A resposta não pode ficar vazia');
      return;
    }
    approve.mutate(
      {
        id: action.id,
        conversationId: action.conversationId,
        ...(isReply ? { text: editedText.trim() } : {}),
      },
      {
        onSuccess: () =>
          toast.success(wasEdited ? 'Resposta editada e aprovada' : 'Ação aprovada'),
        onError: (err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Erro ao aprovar ação';
          toast.error(message);
        },
      },
    );
  };

  const submitReject = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error('Informe o motivo da rejeição');
      return;
    }
    reject.mutate(
      { id: action.id, reason: trimmed, conversationId: action.conversationId },
      {
        onSuccess: () => {
          toast.success('Ação rejeitada');
          setRejectOpen(false);
          setReason('');
        },
        onError: (err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Erro ao rejeitar ação';
          toast.error(message);
        },
      },
    );
  };

  const handleRegenerate = () => {
    const c = complement.trim();
    if (!c) {
      toast.error('Escreva a informação complementar');
      return;
    }
    regenerate.mutate(
      { conversationId: action.conversationId, complement: c, scope },
      {
        onSuccess: () => {
          toast.success('Regerando a resposta com a nova informação…');
          setComplement('');
          setShowComplement(false);
          setScope('item');
        },
        onError: (err: unknown) =>
          toast.error(
            err instanceof Error ? err.message : 'Erro ao regerar resposta',
          ),
      },
    );
  };

  const toolLabel = TOOL_LABELS[action.toolName] ?? action.toolName;
  const Icon = style.Icon;

  // Ações expiradas NÃO permanecem na tela — sem card de "Expirado" pendurado.
  // Backend já expira a antiga ao regerar; aqui garantimos que o countdown a 0
  // remove o card na hora (o refetch em seguida a tira da lista de vez).
  if (expired) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className={`rounded-lg border p-4 shadow-sm ${style.card}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${style.iconWrap}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.badge}`}
            >
              {toolLabel}
            </span>
            <span
              className={`inline-flex items-center rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-900/60 dark:text-zinc-300 dark:ring-zinc-700`}
            >
              Impacto: {action.preview.impact}
            </span>
            <span
              className={`ml-auto inline-flex items-center gap-1 text-xs font-medium ${
                expired
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-zinc-600 dark:text-zinc-300'
              }`}
              title={`Expira em ${new Date(action.expiresAt).toLocaleString('pt-BR')}`}
            >
              <Clock className="h-3.5 w-3.5" />
              {formatCountdown(remainingMs)}
            </span>
          </div>

          {isReply ? (
            <div className="mt-2">
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                disabled={isTerminal || isWorking}
                rows={Math.min(Math.max(editedText.split('\n').length, 3), 14)}
                className="w-full resize-y whitespace-pre-wrap rounded-lg border border-zinc-300 bg-white/80 p-2.5 text-sm leading-relaxed text-zinc-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-100"
                placeholder="Resposta ao cliente…"
              />
              <p className="mt-1 text-[11px] text-zinc-500">
                Você pode editar a resposta antes de aprovar.
                {wasEdited && (
                  <span className="ml-1 font-medium text-amber-600 dark:text-amber-400">
                    Editada — o original da IA fica registrado.
                  </span>
                )}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-800 dark:text-zinc-100">
              {action.preview.action}
            </p>
          )}

          {action.preview.generatedBy && (
            <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              Gerado por:{' '}
              <span className="font-medium">{action.preview.generatedBy}</span>
            </p>
          )}

          {action.preview.affectedEntity && (
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Alvo:{' '}
              <span className="font-medium">
                {action.preview.affectedEntity.label ??
                  `${action.preview.affectedEntity.type}#${action.preview.affectedEntity.id}`}
              </span>
            </p>
          )}

          {action.preview.rollback && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-semibold">Rollback:</span>{' '}
              {action.preview.rollback}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleApprove}
              disabled={isTerminal || isWorking}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {approve.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Aprovar
            </button>
            <button
              type="button"
              onClick={() => setRejectOpen(true)}
              disabled={isTerminal || isWorking}
              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              Rejeitar
            </button>
            {isReply && (
              <button
                type="button"
                onClick={() => setShowComplement((v) => !v)}
                disabled={isTerminal || isWorking || regenerate.isPending}
                className="inline-flex items-center gap-1.5 rounded-md border border-violet-300 bg-white px-3 py-1.5 text-xs font-medium text-violet-700 shadow-sm transition-colors hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-800 dark:bg-transparent dark:text-violet-300 dark:hover:bg-violet-950/40"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Regerar com info
              </button>
            )}
          </div>

          {/* Info complementar → regera a resposta. O complemento também é
              salvo na base de conhecimento (memória) pra respostas futuras. */}
          {isReply && showComplement && (
            <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50/60 p-3 dark:border-violet-900/60 dark:bg-violet-950/20">
              <label className="text-[12px] font-medium text-violet-800 dark:text-violet-300">
                Informação complementar
              </label>
              <p className="mb-2 text-[11px] text-zinc-500">
                Ex: &quot;Material é MDF&quot;. A IA regera a resposta usando isso, e o
                fato fica salvo pra próximas perguntas.
              </p>
              <textarea
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                disabled={regenerate.isPending}
                rows={2}
                placeholder="Digite o que a IA precisa saber…"
                className="w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                autoFocus
              />

              {/* Escopo: fato deste anúncio (padrão) ou geral da loja. */}
              <div className="mt-2">
                <span className="text-[11px] text-zinc-500">Aplicar a:</span>
                <div className="mt-1 inline-flex overflow-hidden rounded-md border border-zinc-300 dark:border-zinc-700">
                  {(
                    [
                      { key: 'item', label: 'Este anúncio' },
                      { key: 'store', label: 'Toda a loja' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setScope(opt.key)}
                      disabled={regenerate.isPending}
                      className={`px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                        scope === opt.key
                          ? 'bg-violet-600 text-white'
                          : 'bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-zinc-400">
                  {scope === 'item'
                    ? 'Vale só pra este anúncio (marketplace).'
                    : 'Vale pra toda a loja, em qualquer conversa.'}
                </p>
              </div>

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowComplement(false);
                    setComplement('');
                  }}
                  disabled={regenerate.isPending}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={regenerate.isPending || !complement.trim()}
                  className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {regenerate.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Regerar resposta
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {rejectOpen && (
        <RejectReasonDialog
          working={reject.isPending}
          reason={reason}
          onChangeReason={setReason}
          onCancel={() => {
            if (reject.isPending) return;
            setRejectOpen(false);
            setReason('');
          }}
          onConfirm={submitReject}
        />
      )}
    </motion.div>
  );
}

/**
 * Lightweight modal mirroring `rename-conversation-dialog.tsx` styling so
 * it feels native to the inbox without pulling a heavier Dialog primitive.
 */
function RejectReasonDialog({
  working,
  reason,
  onChangeReason,
  onCancel,
  onConfirm,
}: {
  working: boolean;
  reason: string;
  onChangeReason: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !working) onCancel();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [working, onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={() => !working && onCancel()}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Rejeitar ação
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={working}
            aria-label="Fechar"
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2 px-4 py-4">
          <label className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
            Motivo
          </label>
          <p className="text-[11px] text-zinc-500">
            Fica registrado no histórico do agente. Ajuda a refinar prompts.
          </p>
          <textarea
            value={reason}
            onChange={(e) => onChangeReason(e.target.value)}
            disabled={working}
            rows={3}
            placeholder="Ex: cliente ainda não pagou, vou conferir o boleto antes."
            className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            autoFocus
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
          <button
            type="button"
            onClick={onCancel}
            disabled={working}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={working || reason.trim().length === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {working && <Loader2 className="h-3 w-3 animate-spin" />}
            Confirmar rejeição
          </button>
        </div>
      </div>
    </div>
  );
}
