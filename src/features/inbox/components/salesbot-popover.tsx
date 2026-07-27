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
        title="Iniciar um Salesbot nesta conversa"
        className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
      >
        <Workflow className="h-3.5 w-3.5" />
        Salesbot
        <ChevronDown className="h-3 w-3 text-zinc-400" />
      </PopoverButton>

      <PopoverPanel
        anchor="bottom end"
        transition
        className="z-50 mt-1.5 w-72 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 dark:border-zinc-800 dark:bg-zinc-900 [--anchor-gap:0.25rem]"
      >
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
