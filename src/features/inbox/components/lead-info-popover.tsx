'use client';

/**
 * Popover "Lead" no header da conversa: mostra data + fonte + enriquecimento
 * (contato/tracking) do lead vinculado. Reaproveita o card ligado à conversa
 * (listByConversation → getCard) e o mesmo componente do detalhe do card.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import {
  LeadHeader,
  LeadEnrichment,
} from '@/features/pipelines/components/lead-enrichment';

export function LeadInfoPopover({ conversationId }: { conversationId: string }) {
  const [open, setOpen] = useState(false);

  const { data: cards } = useQuery({
    queryKey: ['conversation-cards', conversationId],
    queryFn: () => pipelinesService.listByConversation(conversationId),
    enabled: open,
  });
  const cardId = cards?.[0]?.id;

  const { data: detail, isLoading } = useQuery({
    queryKey: ['card-detail', cardId],
    queryFn: () => pipelinesService.getCard(cardId!),
    enabled: open && !!cardId,
  });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Dados do lead (fonte, contato, tracking)"
        className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
          open
            ? 'bg-primary/10 text-primary dark:bg-primary/15'
            : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300'
        }`}
      >
        <Sparkles className="h-3.5 w-3.5" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-80 max-h-[70vh] overflow-y-auto rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
              Lead
            </p>
            {isLoading && (
              <p className="text-xs text-zinc-400">Carregando…</p>
            )}
            {!isLoading && !detail && (
              <p className="text-xs text-zinc-400">
                Nenhum lead/card vinculado a esta conversa.
              </p>
            )}
            {detail && (
              <div className="space-y-3">
                <LeadHeader card={detail} />
                <LeadEnrichment card={detail} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
