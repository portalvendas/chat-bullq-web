'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { ChevronDown, Workflow, Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';
import { cadencesService, type Cadence } from '@/features/cadences/services/cadences.service';
import { type Conversation } from '../services/inbox.service';

interface Props {
  conversation: Conversation;
}

/**
 * Popover do header pra ATIVAR MANUALMENTE um Salesbot na conversa atual —
 * paridade com o "ativar o robô manualmente" do Kommo (Follow-up Manual/
 * Automático). Lista os bots ativos e chama POST /cadences/:id/start.
 */
export function SalesbotPopover({ conversation }: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  const { data: bots = [], isLoading } = useQuery<Cadence[]>({
    queryKey: ['cadences'],
    queryFn: () => cadencesService.list(),
    staleTime: 30_000,
  });
  const active = bots.filter((b) => b.active);

  // Salesbots REALMENTE rodando nesta conversa (RUNNING/WAITING).
  const { data: running = [] } = useQuery({
    queryKey: ['salesbot-active', conversation.id],
    queryFn: () => cadencesService.activeForConversation(conversation.id),
    refetchInterval: 15_000,
  });
  const runningBot = running[0];

  const start = async (bot: Cadence) => {
    setBusy(bot.id);
    try {
      const r = await cadencesService.start(bot.id, conversation.id);
      if (r.started) {
        toast.success(`Salesbot "${bot.name}" iniciado`);
      } else {
        toast.info(
          r.reason === 'already_running'
            ? 'Esse Salesbot já está rodando nesta conversa'
            : r.reason === 'inactive'
              ? 'Salesbot está pausado'
              : 'Não foi possível iniciar',
        );
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao iniciar o Salesbot');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Popover className="relative">
      <PopoverButton
        title={
          runningBot
            ? `Salesbot rodando: ${runningBot.name}`
            : 'Iniciar um Salesbot nesta conversa'
        }
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${
          runningBot
            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300'
            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
        }`}
      >
        {runningBot ? (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        ) : (
          <Workflow className="h-3.5 w-3.5" />
        )}
        <span className="max-w-[120px] truncate">
          {runningBot ? runningBot.name : 'Salesbot'}
        </span>
        <ChevronDown className="h-3 w-3 text-zinc-400" />
      </PopoverButton>

      <PopoverPanel
        anchor="bottom end"
        transition
        className="z-50 mt-1.5 w-72 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 dark:border-zinc-800 dark:bg-zinc-900 [--anchor-gap:0.25rem]"
      >
        {running.length > 0 && (
          <div className="mb-2 rounded-md border border-emerald-200 bg-emerald-50 p-2 dark:border-emerald-900/40 dark:bg-emerald-900/15">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              Rodando nesta conversa
            </p>
            {running.map((r) => (
              <div key={r.runId} className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-200">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="truncate font-medium">{r.name}</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  {r.status === 'WAITING' ? 'aguardando' : 'ativo'}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Iniciar Salesbot
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-4 text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : active.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-200 px-3 py-3 text-center text-[11px] text-zinc-400 dark:border-zinc-700">
            Nenhum Salesbot ativo. Crie em Jarvis → Salesbots.
          </p>
        ) : (
          <div className="max-h-64 space-y-0.5 overflow-y-auto">
            {active.map((bot) => (
              <button
                key={bot.id}
                onClick={() => start(bot)}
                disabled={busy === bot.id}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {busy === bot.id ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-zinc-400" />
                ) : (
                  <Play className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                )}
                <span className="truncate">{bot.name}</span>
              </button>
            ))}
          </div>
        )}
      </PopoverPanel>
    </Popover>
  );
}
