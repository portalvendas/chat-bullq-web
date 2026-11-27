'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { pipelinesService, type CardSummary } from '../services/pipelines.service';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';
import { CardDialog } from './card-dialog';
import { AddConversationDialog } from './add-conversation-dialog';
import { ConversationDialog } from '@/features/inbox/components/conversation-dialog';
import { ArrowRightLeft, Calendar } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { LeadTransferDialog } from './lead-transfer-dialog';
import { LeadSourceFilter } from './lead-source-filter';

// ─── Filtro por data de recebimento do lead ──────────────────────
type DatePreset = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'all';

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: 'yesterday', label: 'Ontem' },
  { key: '7d', label: 'Últimos 7 dias' },
  { key: '30d', label: 'Últimos 30 dias' },
  { key: 'month', label: 'Este mês' },
  { key: 'all', label: 'Tudo' },
];

function rangeFor(preset: DatePreset): { from?: string; to?: string } {
  const now = new Date();
  const start = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const end = (d: Date) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };
  const daysAgo = (n: number) => {
    const x = new Date(now);
    x.setDate(x.getDate() - n);
    return x;
  };
  switch (preset) {
    case 'today':
      return { from: start(now).toISOString(), to: end(now).toISOString() };
    case 'yesterday':
      return {
        from: start(daysAgo(1)).toISOString(),
        to: end(daysAgo(1)).toISOString(),
      };
    case '7d':
      return { from: start(daysAgo(6)).toISOString(), to: end(now).toISOString() };
    case '30d':
      return { from: start(daysAgo(29)).toISOString(), to: end(now).toISOString() };
    case 'month':
      return {
        from: start(new Date(now.getFullYear(), now.getMonth(), 1)).toISOString(),
        to: end(now).toISOString(),
      };
    case 'all':
    default:
      return {};
  }
}

interface Props {
  pipelineId: string;
}

export function KanbanBoard({ pipelineId }: Props) {
  const qc = useQueryClient();
  const [activeCard, setActiveCard] = useState<CardSummary | null>(null);
  // Edit dialog (existing card)
  const [editingCard, setEditingCard] = useState<CardSummary | null>(null);
  // Add-conversation dialog (new card from existing conversation)
  const [addStageId, setAddStageId] = useState<string | null>(null);
  // Conversation popup (when card has a linked conversation, click opens chat).
  const [viewingConvId, setViewingConvId] = useState<string | null>(null);
  // Transferir leads entre vendedores (só OWNER/ADMIN).
  const [transferOpen, setTransferOpen] = useState(false);
  const { organizations, activeOrgId } = useAuthStore();
  const myRole = organizations.find((o) => o.id === activeOrgId)?.role;
  const isAdmin = myRole === 'OWNER' || myRole === 'ADMIN';
  // Filtro por data de recebimento do lead (padrão: últimos 30 dias).
  const [preset, setPreset] = useState<DatePreset>('30d');
  const range = useMemo(() => rangeFor(preset), [preset]);

  const boardKey = [
    'pipeline-board',
    pipelineId,
    range.from ?? 'all',
    range.to ?? 'all',
  ];

  const { data: board, isLoading } = useQuery({
    queryKey: boardKey,
    queryFn: () => pipelinesService.getBoard(pipelineId, range),
  });

  // Filtro por FONTE do lead (tráfego). Vazio = todas. Lembrado por funil
  // neste navegador (conveniência; falha de storage = sem filtro).
  const sourcesKey = `kortia:funil:fontes:${pipelineId}`;
  const [sources, setSources] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(sourcesKey);
      const arr = raw ? JSON.parse(raw) : [];
      setSources(Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []);
    } catch {
      setSources([]);
    }
  }, [sourcesKey]);
  const changeSources = (next: string[]) => {
    setSources(next);
    try {
      window.localStorage.setItem(sourcesKey, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  // Cards exibidos: o filtro é só de VISUALIZAÇÃO — o arrastar continua
  // usando o board completo (cardIndex), então mover entre etapas não muda.
  const visibleCards = useMemo(() => {
    if (!board) return {} as Record<string, CardSummary[]>;
    if (!sources.length) return board.cards;
    const sel = new Set(sources);
    const out: Record<string, CardSummary[]> = {};
    for (const [stageId, list] of Object.entries(board.cards)) {
      out[stageId] = list.filter((c) => sel.has(c.leadSource ?? 'Outros / manual'));
    }
    return out;
  }, [board, sources]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // Build a fast lookup: cardId → { stageId, index } for the move handler.
  const cardIndex = useMemo(() => {
    const idx = new Map<string, { stageId: string; index: number }>();
    if (board) {
      for (const stageId of Object.keys(board.cards)) {
        board.cards[stageId].forEach((c, i) =>
          idx.set(c.id, { stageId, index: i }),
        );
      }
    }
    return idx;
  }, [board]);

  const handleDragStart = (event: DragStartEvent) => {
    const cardId = event.active.id as string;
    const data = event.active.data.current as any;
    if (data?.type === 'card') setActiveCard(data.card as CardSummary);
    else {
      // fallback: search the board
      for (const stageId of Object.keys(board?.cards ?? {})) {
        const found = board!.cards[stageId].find((c) => c.id === cardId);
        if (found) {
          setActiveCard(found);
          break;
        }
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over || !board) return;

    const cardId = active.id as string;
    const targetStageId = over.id as string;
    const target = board.stages.find((s) => s.id === targetStageId);
    if (!target) return;

    const source = cardIndex.get(cardId);
    if (!source) return;

    // Ordenação fixa por data (mais novo → mais antigo): não há reordenação
    // manual DENTRO da coluna. O arrastar só serve pra mover ENTRE etapas.
    if (source.stageId === targetStageId) return;

    // Ao mudar de etapa, insere no fim; o backend reordena por createdAt desc.
    const toIndex = board.cards[targetStageId].length;

    // Optimistic: rebuild the board locally.
    qc.setQueryData<typeof board>(boardKey, (prev) => {
      if (!prev) return prev;
      const newCards = { ...prev.cards };
      const sourceList = [...newCards[source.stageId]];
      const [moved] = sourceList.splice(source.index, 1);
      newCards[source.stageId] = sourceList;
      const targetList = [...(newCards[targetStageId] ?? [])];
      targetList.splice(toIndex, 0, { ...moved, stageId: targetStageId });
      newCards[targetStageId] = targetList;
      return { ...prev, cards: newCards };
    });

    try {
      await pipelinesService.moveCard(cardId, targetStageId, toIndex);
      // Server emits card:moved via socket; refetch to sync orders precisely.
      qc.invalidateQueries({ queryKey: ['pipeline-board', pipelineId] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao mover');
      qc.invalidateQueries({ queryKey: ['pipeline-board', pipelineId] });
    }
  };

  if (isLoading || !board) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-400">
        Carregando board…
      </div>
    );
  }

  const allLeads = Object.values(board.cards).reduce(
    (acc, list) => acc + list.length,
    0,
  );
  const totalLeads = Object.values(visibleCards).reduce(
    (acc, list) => acc + list.length,
    0,
  );

  return (
    <div className="flex h-full flex-col">
      {/* Filtro por data de recebimento do lead (createdAt) */}
      <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2">
        <span className="mr-1 inline-flex items-center gap-1 text-[11px] text-zinc-400">
          <Calendar className="h-3.5 w-3.5" /> Recebidos:
        </span>
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              preset === p.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
            }`}
          >
            {p.label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
        <LeadSourceFilter
          options={board.leadSources ?? []}
          value={sources}
          onChange={changeSources}
        />
        <span className="ml-auto text-[11px] text-zinc-400">
          {sources.length ? `${totalLeads} de ${allLeads} leads` : `${totalLeads} leads`}
        </span>
        {isAdmin && (
          <button
            onClick={() => setTransferOpen(true)}
            title="Transferir leads de um vendedor para outro"
            className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" /> Transferir leads
          </button>
        )}
      </div>
      {transferOpen && (
        <LeadTransferDialog
          defaultPipelineId={pipelineId}
          onClose={() => setTransferOpen(false)}
          onDone={() => qc.invalidateQueries({ queryKey: ['pipeline-board', pipelineId] })}
        />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-3 overflow-x-auto px-4 pb-4">
          {board.stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              cards={visibleCards[stage.id] ?? []}
              onAddCard={() => setAddStageId(stage.id)}
              onOpenConversation={(convId) => setViewingConvId(convId)}
              onCardClick={(c) => {
                // Click primário: abre a conversa em popup. Sem conversa
                // vinculada, cai pra edição do card como fallback.
                if (c.conversationId) setViewingConvId(c.conversationId);
                else setEditingCard(c);
              }}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCard ? <KanbanCard card={activeCard} /> : null}
        </DragOverlay>
      </DndContext>

      <CardDialog
        open={!!editingCard}
        pipelineId={pipelineId}
        card={editingCard}
        stageId={null}
        onClose={() => setEditingCard(null)}
        onOpenConversation={(convId) => {
          setEditingCard(null);
          setViewingConvId(convId);
        }}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['pipeline-board', pipelineId] });
          setEditingCard(null);
        }}
      />

      <AddConversationDialog
        open={!!addStageId}
        pipelineId={pipelineId}
        stageId={addStageId}
        onClose={() => setAddStageId(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['pipeline-board', pipelineId] });
          setAddStageId(null);
        }}
      />

      <ConversationDialog
        open={!!viewingConvId}
        conversationId={viewingConvId}
        onClose={() => setViewingConvId(null)}
      />
    </div>
  );
}
