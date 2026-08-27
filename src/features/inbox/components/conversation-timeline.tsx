'use client';

import { useQuery } from '@tanstack/react-query';
import {
  X, Bot, Megaphone, GitBranch, UserCog, Activity, Sparkles,
  FileText, AlertTriangle, Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';

interface TimelineEvent {
  id: string;
  kind: 'ai' | 'cadence' | 'audit';
  at: string;
  title: string;
  detail: string | null;
  status: string | null;
  meta: Record<string, any>;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });

function iconFor(e: TimelineEvent): { Icon: React.ElementType; color: string } {
  if (e.kind === 'ai') return { Icon: Bot, color: '#8b5cf6' };
  if (e.kind === 'cadence') return { Icon: Megaphone, color: '#f59e0b' };
  const a = String(e.meta?.action ?? '');
  if (a === 'STAGE_MOVED') return { Icon: GitBranch, color: '#3b82f6' };
  if (a.startsWith('AI_')) return { Icon: Sparkles, color: '#8b5cf6' };
  if (a.includes('ASSIGN')) return { Icon: UserCog, color: '#10b981' };
  if (a.includes('TINY')) return { Icon: FileText, color: '#06b6d4' };
  return { Icon: Activity, color: '#a1a1aa' };
}

function StatusPill({ status }: { status: string | null }) {
  if (!status) return null;
  const map: Record<string, string> = {
    ERROR: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
    RUNNING: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
    WAITING: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    STOPPED: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
    DONE: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    SUCCESS: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  };
  const cls = map[status] ?? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400';
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>{status}</span>;
}

export function ConversationTimeline({
  conversationId,
  onClose,
}: {
  conversationId: string;
  onClose: () => void;
}) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['conversation-timeline', conversationId],
    queryFn: async () => {
      const { data } = await api.get(`/conversations/${conversationId}/timeline`);
      return (data?.data ?? data) as TimelineEvent[];
    },
    refetchInterval: 15000,
    staleTime: 5000,
  });

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-1.5">
          <Activity className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Logs da conversa</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {isLoading && (
          <div className="flex items-center justify-center py-10 text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {!isLoading && events.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Activity className="h-8 w-8 text-zinc-300 dark:text-zinc-700" />
            <p className="text-sm text-zinc-400">Nada rodou nessa conversa ainda.</p>
            <p className="text-xs text-zinc-400">
              IA, Salesbot, mudança de etapa e atribuições aparecem aqui.
            </p>
          </div>
        )}

        {!isLoading && events.length > 0 && (
          <ol className="relative space-y-1">
            {events.map((e) => {
              const { Icon, color } = iconFor(e);
              const isAi = e.kind === 'ai';
              return (
                <li key={e.id} className="flex gap-3 rounded-lg p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <div
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${color}1a`, color }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
                        {e.title}
                      </span>
                      <StatusPill status={e.status} />
                    </div>
                    {e.detail && (
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{e.detail}</p>
                    )}

                    {isAi && (e.meta?.error || (e.meta?.failedTools ?? 0) > 0) && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-red-500">
                        <AlertTriangle className="h-3 w-3" />
                        {e.meta?.error
                          ? String(e.meta.error).slice(0, 120)
                          : `${e.meta.failedTools} ferramenta(s) com erro`}
                      </p>
                    )}

                    {isAi && (
                      <p className="mt-1 text-[10px] text-zinc-400">
                        {e.meta?.inputTokens ?? 0} in · {e.meta?.outputTokens ?? 0} out
                        {typeof e.meta?.costUsd === 'number' && e.meta.costUsd > 0
                          ? ` · $${e.meta.costUsd.toFixed(4)}`
                          : ''}
                        {typeof e.meta?.durationMs === 'number'
                          ? ` · ${(e.meta.durationMs / 1000).toFixed(1)}s`
                          : ''}
                      </p>
                    )}

                    <p className="mt-0.5 text-[10px] text-zinc-400">{fmt(e.at)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </aside>
  );
}
