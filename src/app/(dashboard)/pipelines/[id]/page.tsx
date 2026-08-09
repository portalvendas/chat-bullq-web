'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, KanbanSquare, Settings } from 'lucide-react';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import { KanbanBoard } from '@/features/pipelines/components/kanban-board';
import { StagesDialog } from '@/features/pipelines/components/stages-dialog';

export default function PipelineBoardPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const pipelineId = params?.id;
  const [stagesOpen, setStagesOpen] = useState(false);

  // Cabeçalho + stages vêm da LISTA de pipelines (leve: só metadados + stages),
  // não do board inteiro — senão a página carregava TODOS os cards do funil só
  // pra mostrar o nome, ignorando o filtro de data do board. O board (com o
  // filtro de 30 dias) é carregado só pelo KanbanBoard.
  const { data: pipelines } = useQuery({
    queryKey: ['pipelines', 'withArchived'],
    queryFn: () => pipelinesService.list(true),
    enabled: !!pipelineId,
  });
  const pipeline = pipelines?.find((p) => p.id === pipelineId);

  const archived = pipeline?.archived ?? false;

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
            {pipeline?.name ?? 'Pipeline'}
          </h1>
          {pipeline?.description && (
            <p className="text-xs text-zinc-500">{pipeline.description}</p>
          )}
        </div>
        {archived && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Desativado
          </span>
        )}
        <button
          onClick={() => setStagesOpen(true)}
          disabled={!pipeline}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <Settings className="h-3.5 w-3.5" />
          Configurar stages
        </button>
      </div>
      <div className="flex-1 overflow-hidden pt-3">
        <KanbanBoard pipelineId={pipelineId} />
      </div>

      {pipeline && (
        <StagesDialog
          open={stagesOpen}
          pipelineId={pipelineId}
          initialStages={pipeline.stages ?? []}
          pipelineInactivityHours={pipeline.inactivityHours ?? null}
          onClose={() => setStagesOpen(false)}
          onSaved={() => setStagesOpen(false)}
        />
      )}
    </div>
  );
}
