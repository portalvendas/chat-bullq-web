'use client';

/**
 * Popover "Lead" no header da conversa: mostra data + fonte + enriquecimento
 * (contato, formulário e rastreamento) do lead. O card vem de
 * leadCardForConversation, que prioriza o card ABERTO do contato — inclusive o
 * de LP/Lead Ads, que nasce sem vínculo com a conversa — e não o mais antigo.
 * Rastreamento abre já expandido aqui. Mesmo componente do detalhe do card.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Sparkles } from 'lucide-react';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import {
  LeadHeader,
  LeadEnrichment,
} from '@/features/pipelines/components/lead-enrichment';
import { TinyLeadPanel } from '@/features/tiny/components/tiny-lead-panel';
import { LeadCadastroPanel } from './lead-cadastro-panel';

export function LeadInfoPopover({ conversationId }: { conversationId: string }) {
  const [open, setOpen] = useState(false);

  const { data: lead, isLoading: loadingLead } = useQuery({
    queryKey: ['conversation-lead-card', conversationId],
    queryFn: () => pipelinesService.leadCardForConversation(conversationId),
    enabled: open,
  });
  const cardId = lead?.cardId ?? undefined;

  const { data: detail, isLoading: loadingCard } = useQuery({
    queryKey: ['card-detail', cardId],
    queryFn: () => pipelinesService.getCard(cardId!),
    enabled: open && !!cardId,
  });
  const isLoading = loadingLead || (!!cardId && loadingCard);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Dados do lead: origem, formulário e rastreamento (UTM, gclid, fbclid…)"
        className={`inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors ${
          open
            ? 'bg-primary/10 text-primary dark:bg-primary/15'
            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
        }`}
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span>Lead</span>
        <ChevronDown className="h-3 w-3 text-zinc-400" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] max-h-[75vh] overflow-y-auto rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
              Lead
            </p>
            <div className="mb-3">
              <LeadCadastroPanel conversationId={conversationId} />
            </div>
            {isLoading && (
              <p className="text-xs text-zinc-400">Carregando…</p>
            )}
            {!isLoading && !detail && (
              <p className="text-xs text-zinc-400">
                Nenhum card de lead encontrado para este contato.
              </p>
            )}
            {detail && (
              <div className="space-y-3">
                <LeadHeader card={detail} />
                <LeadEnrichment card={detail} defaultShowTracking />
                {detail.contactId && <TinyLeadPanel contactId={detail.contactId} />}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
