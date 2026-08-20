'use client';

/**
 * Rotina Comercial — checklist diário do vendedor, em ordem de prioridade.
 * Cada passo mostra contadores ao vivo (pendentes / parados) e pode ser
 * concluído automaticamente (quando zera) ou marcado à mão (amostragem).
 */
import { useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Circle,
  Loader2,
  ClipboardCheck,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import {
  routineService,
  type RoutineToday,
  type RoutineStepToday,
} from '@/features/commercial-routine/services/routine.service';

export default function RotinaPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['routine', 'today'],
    queryFn: () => routineService.today(),
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  });

  const check = useMutation({
    mutationFn: ({ key, done }: { key: string; done: boolean }) =>
      routineService.check(key, done),
    onSuccess: (updated) => {
      qc.setQueryData(['routine', 'today'], updated);
    },
    onError: () => toast.error('Não foi possível atualizar o passo'),
  });

  const progress = useMemo(() => {
    if (!data) return 0;
    const { stepsDone, stepsTotal } = data.summary;
    return stepsTotal ? Math.round((stepsDone / stepsTotal) * 100) : 0;
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" /> carregando rotina…
      </div>
    );
  }
  if (!data) return null;

  if (!data.enabled) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <ClipboardCheck className="mx-auto h-8 w-8 text-zinc-300" />
          <h1 className="mt-3 text-base font-semibold text-zinc-800 dark:text-zinc-100">
            Rotina Comercial desativada
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            A rotina não está ativa para você. Fale com um administrador para
            ativá-la em Configurações → Rotina.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <Header data={data} progress={progress} />
      <div className="space-y-3">
        {data.steps.map((step) => (
          <StepCard
            key={step.key}
            step={step}
            busy={check.isPending}
            onToggle={(done) => check.mutate({ key: step.key, done })}
          />
        ))}
      </div>
    </div>
  );
}

function Header({ data, progress }: { data: RoutineToday; progress: number }) {
  const { allDone, totalPending, totalParados } = data.summary;
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Rotina Comercial
        </h1>
        <span className="ml-auto text-sm font-medium text-zinc-500">
          {data.summary.stepsDone}/{data.summary.stepsTotal}
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${
            allDone ? 'bg-emerald-500' : 'bg-primary'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {allDone ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Tudo em dia hoje
          </span>
        ) : (
          <Link
            href="/rotina/leads?state=pending"
            className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 font-medium text-amber-700 transition hover:opacity-80 dark:bg-amber-900/30 dark:text-amber-400"
          >
            {totalPending} lead(s) aguardando ação
          </Link>
        )}
        {totalParados > 0 && (
          <Link
            href="/rotina/leads?state=parado"
            className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 font-medium text-red-700 transition hover:opacity-80 dark:bg-red-900/30 dark:text-red-400"
          >
            <AlertTriangle className="h-3.5 w-3.5" /> {totalParados} parado(s)
          </Link>
        )}
      </div>
    </div>
  );
}

function StepCard({
  step,
  busy,
  onToggle,
}: {
  step: RoutineStepToday;
  busy: boolean;
  onToggle: (done: boolean) => void;
}) {
  const boardHref = step.stages.find((s) => s.pipelineId)?.pipelineId
    ? `/pipelines/${step.stages.find((s) => s.pipelineId)!.pipelineId}`
    : null;

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        step.done
          ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-900/10'
          : step.pending > 0
            ? 'border-amber-200 bg-white dark:border-amber-900/40 dark:bg-zinc-900'
            : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => onToggle(!step.checked)}
          title={step.checked ? 'Desmarcar' : 'Marcar como concluído'}
          className="mt-0.5 shrink-0 disabled:opacity-50"
        >
          {step.done ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          ) : (
            <Circle className="h-6 w-6 text-zinc-300 hover:text-zinc-400 dark:text-zinc-600" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-zinc-400">
              {step.order}
            </span>
            <h3
              className={`text-sm font-semibold ${
                step.done
                  ? 'text-zinc-500 line-through dark:text-zinc-500'
                  : 'text-zinc-900 dark:text-zinc-100'
              }`}
            >
              {step.label}
            </h3>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {step.guidance}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {step.stageIds.length === 0 ? (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-400 dark:bg-zinc-800">
                sem etapa configurada
              </span>
            ) : (
              <>
                <Metric
                  value={step.pending}
                  label={step.requireCheck ? 'p/ conferir' : 'pendentes'}
                  tone={step.pending > 0 ? 'amber' : 'zinc'}
                  href={
                    step.pending > 0
                      ? `/rotina/leads?step=${step.key}&state=pending`
                      : undefined
                  }
                />
                {step.parados > 0 && (
                  <Metric
                    value={step.parados}
                    label="parados"
                    tone="red"
                    href={`/rotina/leads?step=${step.key}&state=parado`}
                  />
                )}
                <span className="text-[11px] text-zinc-400">
                  {step.total} no total
                </span>
              </>
            )}
            {boardHref && (
              <Link
                href={boardHref}
                className="ml-auto inline-flex items-center gap-0.5 text-[11px] font-medium text-primary hover:underline"
              >
                Abrir funil <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>

          {step.requireCheck && (
            <p className="mt-1.5 text-[11px] italic text-zinc-400">
              Este passo pede conferência manual — marque quando concluir.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({
  value,
  label,
  tone,
  href,
}: {
  value: number;
  label: string;
  tone: 'amber' | 'red' | 'zinc';
  href?: string;
}) {
  const cls =
    tone === 'amber'
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
      : tone === 'red'
        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300';
  const inner = (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${cls} ${
        href ? 'cursor-pointer transition hover:opacity-80' : ''
      }`}
    >
      {value} {label}
    </span>
  );
  return href ? (
    <Link href={href} title="Ver estes leads">
      {inner}
    </Link>
  ) : (
    inner
  );
}
