'use client';

/**
 * Rotina Comercial → Leads filtrados. Abre a lista EXATA de leads que geram um
 * contador da rotina: um passo (stepKey) OU todos (stepKey ausente), no estado
 * "pending" (aguardando ação) ou "parado". Bate 1:1 com o número clicado.
 */
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  KanbanSquare,
  AlertTriangle,
  Clock,
  User,
  Phone,
} from 'lucide-react';
import { routineService } from '@/features/commercial-routine/services/routine.service';

function brl(v: number | null): string {
  if (v == null) return '';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function since(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return 'há < 1h';
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

function LeadsView() {
  const sp = useSearchParams();
  const stepKey = sp.get('step');
  const state = sp.get('state') === 'parado' ? 'parado' : 'pending';

  const { data, isLoading } = useQuery({
    queryKey: ['routine', 'leads', stepKey, state],
    queryFn: () => routineService.stepLeads(stepKey, state),
    staleTime: 30_000,
  });

  const parado = state === 'parado';

  return (
    <div className="h-full overflow-y-auto mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Link
          href="/rotina"
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {data?.label ?? (parado ? 'Leads parados' : 'Leads aguardando ação')}
          </h1>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
              parado
                ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            }`}
          >
            {parado ? (
              <>
                <AlertTriangle className="h-3 w-3" /> Parados
              </>
            ) : (
              <>
                <Clock className="h-3 w-3" /> Aguardando ação
              </>
            )}
            {typeof data?.count === 'number' && ` · ${data.count}`}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" /> carregando leads…
        </div>
      ) : !data || data.leads.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          Nenhum lead neste filtro. 🎉
        </div>
      ) : (
        <ul className="space-y-2">
          {data.leads.map((l) => (
            <li
              key={l.id}
              className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                    <span className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      {l.contactName || l.title || 'Lead'}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
                    {l.contactPhone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {l.contactPhone}
                      </span>
                    )}
                    {l.stageName && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
                        {l.stageName}
                      </span>
                    )}
                    <span
                      className={
                        parado ? 'text-red-500' : 'text-zinc-400'
                      }
                    >
                      últ. contato {since(l.lastActivityAt)}
                    </span>
                    {l.assignedToName && (
                      <span className="text-zinc-400">• {l.assignedToName}</span>
                    )}
                  </div>
                </div>
                {l.value != null && (
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
                    {brl(l.value)}
                  </span>
                )}
              </div>

              <div className="mt-2 flex items-center gap-3">
                {l.conversationId && (
                  <Link
                    href={`/inbox?conversationId=${l.conversationId}`}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                  >
                    <MessageSquare className="h-3 w-3" /> Ver conversa
                  </Link>
                )}
                {l.pipelineId && (
                  <Link
                    href={`/pipelines/${l.pipelineId}`}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:underline"
                  >
                    <KanbanSquare className="h-3 w-3" /> Abrir no funil
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function RotinaLeadsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 p-6 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" /> carregando…
        </div>
      }
    >
      <LeadsView />
    </Suspense>
  );
}
