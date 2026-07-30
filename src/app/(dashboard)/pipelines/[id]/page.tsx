'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, KanbanSquare, Settings, Archive, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import { KanbanBoard } from '@/features/pipelines/components/kanban-board';
import { StagesDialog } from '@/features/pipelines/components/stages-dialog';

export default function PipelineBoardPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const pipelineId = params?.id;
  const [stagesOpen, setStagesOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: board } = useQuery({
    queryKey: ['pipeline-board', pipelineId],
    queryFn: () => pipelinesService.getBoard(pipelineId!),
    enabled: !!pipelineId,
  });

  const archived = board?.pipeline?.archived ?? false;

  const handleToggleArchive = async () => {
    if (!pipelineId) return;
    const next = !archived;
    if (
      next &&
      !confirm(
        `Desativar o funil "${board?.pipeline?.name ?? ''}"? Ele some da lista e do inbox, mas os cards e dados são preservados. Você pode reativar depois.`,
      )
    )
      return;
    setBusy(true);
    try {
      await pipelinesService.update(pipelineId, { archived: next } as any);
      toast.success(next ? 'Funil desativado' : 'Funil reativado');
      qc.invalidateQueries({ queryKey: ['pipelines'] });
      qc.invalidateQueries({ queryKey: ['pipeline-board', pipelineId] });
      if (next) router.push('/pipelines');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao atualizar o funil');
    } finally {
      setBusy(false);
    }
  };

  if (!pipelineId) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <button
          onClick={() => router.push('/pipelines')}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <KanbanSquare className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {board?.pipeline?.name ?? 'Pipeline'}
          </h1>
          {board?.pipeline?.description && (
            <p className="text-xs text-zinc-500">
              {board.pipeline.description}
            </p>
          )}
        </div>
        {archived && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Desativado
          </span>
        )}
        <button
          onClick={() => setStagesOpen(true)}
          disabled={!board}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <Settings className="h-3.5 w-3.5" />
          Configurar stages
        </button>
        <button
          onClick={handleToggleArchive}
          disabled={!board || busy}
          className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
            archived
              ? 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-zinc-900 dark:text-emerald-400 dark:hover:bg-emerald-900/20'
              : 'border-zinc-200 bg-white text-zinc-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-amber-900/20 dark:hover:text-amber-400'
          }`}
        >
          {archived ? (
            <>
              <RotateCcw className="h-3.5 w-3.5" />
              Reativar funil
            </>
          ) : (
            <>
              <Archive className="h-3.5 w-3.5" />
              Desativar funil
            </>
          )}
        </button>
      </div>
      <div className="flex-1 overflow-hidden pt-3">
        <KanbanBoard pipelineId={pipelineId} />
      </div>

      {board && (
        <StagesDialog
          open={stagesOpen}
          pipelineId={pipelineId}
          initialStages={board.stages}
          onClose={() => setStagesOpen(false)}
          onSaved={() => setStagesOpen(false)}
        />
      )}
    </div>
  );
}
