'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Trash2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  pipelinesService,
  type CardSummary,
} from '../services/pipelines.service';
import { LeadHeader, LeadEnrichment } from './lead-enrichment';

interface Props {
  open: boolean;
  pipelineId: string;
  card: CardSummary | null;
  stageId: string | null;
  onClose: () => void;
  onSaved: () => void;
  /** Abrir a conversa (chat) do lead — cruzando o card com o canal de texto ativo. */
  onOpenConversation?: (conversationId: string) => void;
}

const CHANNEL_LABEL: Record<string, string> = {
  WHATSAPP_ZAPI: 'WhatsApp',
  WHATSAPP_OFFICIAL: 'WhatsApp',
  WHATSAPP_ZAPPFY: 'WhatsApp',
  INSTAGRAM: 'Instagram',
  TELEGRAM: 'Telegram',
  MERCADO_LIVRE: 'Mercado Livre',
  SHOPEE: 'Shopee',
};

export function CardDialog({
  open,
  pipelineId,
  card,
  stageId,
  onClose,
  onSaved,
  onOpenConversation,
}: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [closedReason, setClosedReason] = useState('');
  const [saving, setSaving] = useState(false);

  // Detalhe completo (contato + tracking) — só busca ao editar um card existente.
  const { data: detail } = useQuery({
    queryKey: ['card-detail', card?.id],
    queryFn: () => pipelinesService.getCard(card!.id),
    enabled: open && !!card?.id,
  });

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description ?? '');
      setValue(card.value ? String(card.value) : '');
      setClosedReason(card.closedReason ?? '');
    } else {
      setTitle('');
      setDescription('');
      setValue('');
      setClosedReason('');
    }
  }, [card, open]);

  if (!open) return null;

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    setSaving(true);
    try {
      const numericValue = value ? parseFloat(value.replace(',', '.')) : undefined;
      if (card) {
        await pipelinesService.updateCard(card.id, {
          title: title.trim(),
          description: description || null,
          value: numericValue as any,
          closedReason: closedReason || undefined,
        } as any);
      } else {
        await pipelinesService.createCard(pipelineId, {
          title: title.trim(),
          description: description || undefined,
          value: numericValue,
          stageId: stageId ?? undefined,
        });
      }
      toast.success(card ? 'Card atualizado' : 'Card criado');
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!card) return;
    if (!confirm(`Excluir card "${card.title}"?`)) return;
    setSaving(true);
    try {
      await pipelinesService.removeCard(card.id);
      toast.success('Card removido');
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao excluir');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl dark:bg-zinc-900">
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {card ? 'Editar card' : 'Novo card'}
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* Antes do detalhe: data do lead + fonte (Facebook/Instagram/LP…) */}
          {detail && <LeadHeader card={detail} />}

          {/* Chat do lead: cruza o card com os canais de texto ativos do
              contato (WhatsApp/Instagram/…) — abre a conversa direto daqui,
              inclusive em cards importados que não nasceram de uma conversa. */}
          {onOpenConversation &&
            (detail?.contact?.conversations?.length ?? 0) > 0 && (
              <div className="rounded-lg border border-zinc-200 p-2.5 dark:border-zinc-800">
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                  Conversas do lead
                </p>
                <div className="flex flex-col gap-1.5">
                  {detail!.contact!.conversations!.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => onOpenConversation(c.id)}
                      className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 px-2.5 py-1.5 text-left text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      <span className="inline-flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
                        <MessageCircle className="h-4 w-4 text-primary" />
                        Abrir conversa
                        {c.channel && (
                          <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                            {CHANNEL_LABEL[c.channel.type] || c.channel.name}
                          </span>
                        )}
                      </span>
                      {c.lastMessageAt && (
                        <span className="text-[10px] tabular-nums text-zinc-400">
                          {new Date(c.lastMessageAt).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Título
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Lead Bravy School"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Descrição
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="contexto, próximos passos, info coletada…"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Valor (R$)
            </label>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="ex: 4500"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              inputMode="decimal"
            />
          </div>

          {card && card.status !== 'OPEN' && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Motivo do fechamento
              </label>
              <input
                value={closedReason}
                onChange={(e) => setClosedReason(e.target.value)}
                placeholder={
                  card.status === 'WON'
                    ? 'ex: assinou contrato 12 meses'
                    : 'ex: optou por concorrente'
                }
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          )}

          {/* Enriquecimento do lead: contato completo + tracking/UTM */}
          {detail && <LeadEnrichment card={detail} />}
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-zinc-200 bg-zinc-50 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div>
            {card && (
              <button
                onClick={handleDelete}
                disabled={saving}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title}
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Salvando…' : card ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
