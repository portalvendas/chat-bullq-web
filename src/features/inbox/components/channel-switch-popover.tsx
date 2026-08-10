'use client';

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Repeat, Check } from 'lucide-react';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import { inboxService } from '../services/inbox.service';

/**
 * Troca o canal de WhatsApp da conversa. Útil quando a conversa está no
 * WhatsApp Oficial fora da janela de 24h (tag +24h): trocar para um Z-API
 * libera o envio de texto livre para chamar o cliente.
 */
export function ChannelSwitchPopover({
  conversationId,
  currentChannelId,
  currentChannelType,
  highlight = false,
}: {
  conversationId: string;
  currentChannelId: string;
  currentChannelType: string;
  /** Realça o botão (vermelho) quando a conversa está travada por 24h (+24h). */
  highlight?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  // Só faz sentido para canais de WhatsApp.
  if (!currentChannelType?.startsWith('WHATSAPP')) return null;

  const { data: channels = [] } = useQuery({
    queryKey: ['wa-channels'],
    queryFn: () => pipelinesService.listWhatsappChannels(),
    enabled: open,
    staleTime: 60_000,
  });

  const switchTo = useMutation({
    mutationFn: (channelId: string) =>
      inboxService.switchChannel(conversationId, channelId),
    onSuccess: () => {
      toast.success('Canal da conversa alterado');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['conversation', conversationId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'Erro ao trocar canal'),
  });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title={
          highlight
            ? 'Conversa travada por 24h — troque para um WhatsApp livre (Z-API) para chamar o cliente'
            : 'Trocar canal de WhatsApp'
        }
        className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-colors ${
          highlight
            ? 'animate-pulse border-red-300 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
            : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
        }`}
      >
        <Repeat className="h-3.5 w-3.5" />
        {highlight ? 'Trocar canal (+24h)' : 'Canal'}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-zinc-200 bg-white p-1.5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Enviar por
            </p>
            {channels.length === 0 && (
              <p className="px-2 py-2 text-xs text-zinc-400">Carregando…</p>
            )}
            {channels.map((ch) => {
              const isCurrent = ch.id === currentChannelId;
              const isOfficial = ch.type === 'WHATSAPP_OFFICIAL';
              return (
                <button
                  key={ch.id}
                  disabled={isCurrent || switchTo.isPending}
                  onClick={() => switchTo.mutate(ch.id)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-zinc-100 disabled:opacity-60 dark:hover:bg-zinc-800"
                >
                  <span className="truncate">
                    {ch.name}{' '}
                    <span className="text-[10px] text-zinc-400">
                      {isOfficial ? '(oficial · 24h)' : '(livre)'}
                    </span>
                  </span>
                  {isCurrent && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              );
            })}
            <p className="px-2 pb-1 pt-1.5 text-[10px] text-zinc-400">
              Canal "livre" (Z-API) envia texto fora da janela de 24h; o Oficial
              exige template aprovado.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
