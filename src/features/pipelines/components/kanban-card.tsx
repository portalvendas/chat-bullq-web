'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MessageSquare, User, Calendar } from 'lucide-react';
import { ZappfyIcon, MetaIcon, InstagramIcon } from '@/components/ui/icons';
import { deriveLeadSource } from './lead-enrichment';
import type { CardSummary } from '../services/pipelines.service';

const channelIconByType: Record<string, React.ElementType> = {
  WHATSAPP_ZAPPFY: ZappfyIcon,
  WHATSAPP_OFFICIAL: MetaIcon,
  INSTAGRAM: InstagramIcon,
};

/** Data do lead na capa do card: 30/07/2026 14:47 (sem vírgula). */
const fmtLeadDate = (iso?: string | null): string => {
  if (!iso) return '';
  try {
    return new Date(iso)
      .toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      .replace(',', '');
  } catch {
    return '';
  }
};

const formatBRL = (v: number | string | null) => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (Number.isNaN(n)) return null;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(n);
};

interface Props {
  card: CardSummary;
  onClick?: () => void;
  /** Abre o chat do lead direto da capa (cruza com o canal de texto ativo). */
  onOpenConversation?: (conversationId: string) => void;
}

export function KanbanCard({ card, onClick, onOpenConversation }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: card.id,
      data: { type: 'card', card },
    });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  const value = formatBRL(card.value);
  const contact = card.contact;
  const assignedTo = card.assignedTo;
  const isClosed = card.status !== 'OPEN';

  // Conversa a abrir pela capa: a do próprio card (se veio de conversa) ou a
  // mais recente do contato (cards importados cruzam com o WhatsApp/IG ativo).
  const contactConv = card.contact?.conversations?.[0];
  const openConvId = card.conversationId ?? contactConv?.id ?? null;
  const openConvChannelType =
    card.conversation?.channel?.type ?? contactConv?.channel?.type ?? null;
  const OpenConvIcon =
    (openConvChannelType && channelIconByType[openConvChannelType]) ||
    MessageSquare;

  // Capa: data do lead + fonte (logo). Tracking/source vive em card.metadata
  // (leads de LP/Ads); senão cai pro canal da conversa.
  const meta = (card.metadata ?? {}) as any;
  const leadDate = fmtLeadDate(card.createdAt);
  const source = deriveLeadSource(
    (meta.tracking ?? {}) as any,
    meta.source,
    card.conversation?.channel?.type,
  );
  const SourceIcon = source.Icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`group relative cursor-pointer rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:bg-zinc-900 ${
        isClosed
          ? 'border-zinc-200 opacity-70 dark:border-zinc-800'
          : 'border-zinc-200 dark:border-zinc-800'
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 cursor-grab text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing dark:text-zinc-600"
          aria-label="Arrastar"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {card.title}
          </p>
          {card.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
              {card.description}
            </p>
          )}
        </div>
      </div>

      {/* Capa: data do lead + logo da fonte */}
      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-zinc-400">
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {leadDate}
        </span>
        <span
          title={`Fonte: ${source.label}`}
          className={`inline-flex max-w-[55%] items-center gap-1 truncate rounded-full px-1.5 py-0.5 font-medium ${source.cls}`}
        >
          <SourceIcon className="h-3 w-3 shrink-0" />
          <span className="truncate">{source.label}</span>
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-500">
        {value && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            {value}
          </span>
        )}
        {card.status === 'WON' && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700 dark:bg-green-900/40 dark:text-green-400">
            ganho
          </span>
        )}
        {card.status === 'LOST' && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700 dark:bg-red-900/40 dark:text-red-400">
            perdido
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-zinc-500">
        {contact ? (
          <span className="inline-flex min-w-0 items-center gap-1 truncate">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{contact.name || contact.phone}</span>
          </span>
        ) : (
          <span />
        )}
        <div className="flex shrink-0 items-center gap-1">
          {openConvId && onOpenConversation && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenConversation(openConvId);
              }}
              title="Abrir conversa do lead"
              className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              aria-label="Abrir conversa"
            >
              <OpenConvIcon className="h-3 w-3" />
            </button>
          )}
          {assignedTo && (
            <span
              title={assignedTo.name}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary"
            >
              {assignedTo.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
