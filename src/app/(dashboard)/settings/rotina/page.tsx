'use client';

/**
 * Configurações → Rotina Comercial. Admin mapeia cada passo do checklist às
 * etapas de funil que ele monitora (podem ser de funis diferentes) e ajusta o
 * limiar de "lead parado".
 */
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, ClipboardCheck } from 'lucide-react';
import {
  routineService,
  type RoutineStepConfig,
} from '@/features/commercial-routine/services/routine.service';

interface StepState {
  key: string;
  label: string;
  guidance: string;
  stageIds: string[];
  thresholdHours: string;
  requireCheck: boolean;
}

export default function SettingsRotinaPage() {
  const qc = useQueryClient();
  const { data: cfg, isLoading } = useQuery({
    queryKey: ['routine', 'config'],
    queryFn: () => routineService.getConfig(),
    staleTime: 30_000,
  });
  const { data: options } = useQuery({
    queryKey: ['routine', 'options'],
    queryFn: () => routineService.options(),
    staleTime: 60_000,
  });

  const [enabled, setEnabled] = useState(true);
  const [steps, setSteps] = useState<StepState[]>([]);

  useEffect(() => {
    if (!cfg) return;
    setEnabled(cfg.enabled);
    setSteps(
      cfg.steps.map((s: RoutineStepConfig) => ({
        key: s.key,
        label: s.label,
        guidance: s.guidance,
        stageIds: s.stageIds ?? [],
        thresholdHours: String(s.thresholdHours ?? 0),
        requireCheck: !!s.requireCheck,
      })),
    );
  }, [cfg]);

  const stageName = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of options?.pipelines ?? [])
      for (const st of p.stages) m.set(st.id, `${p.name} · ${st.name}`);
    return m;
  }, [options]);

  const toggleStage = (key: string, stageId: string) =>
    setSteps((prev) =>
      prev.map((s) =>
        s.key === key
          ? {
              ...s,
              stageIds: s.stageIds.includes(stageId)
                ? s.stageIds.filter((id) => id !== stageId)
                : [...s.stageIds, stageId],
            }
          : s,
      ),
    );

  const save = useMutation({
    mutationFn: () =>
      routineService.updateConfig({
        enabled,
        steps: steps.map((s) => ({
          key: s.key,
          stageIds: s.stageIds,
          thresholdHours: parseInt(s.thresholdHours, 10) || 0,
          requireCheck: s.requireCheck,
        })),
      }),
    onSuccess: (updated) => {
      qc.setQueryData(['routine', 'config'], updated);
      qc.invalidateQueries({ queryKey: ['routine', 'today'] });
      toast.success('Rotina salva');
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'Falha ao salvar'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" /> carregando…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          <ClipboardCheck className="h-5 w-5" /> Rotina Comercial
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Mapeie cada passo do checklist às etapas de funil que ele deve
          monitorar. Cada passo pode usar etapas de funis diferentes. O limiar
          define a partir de quantas horas um lead conta como "parado".
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-300"
        />
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          Rotina ativa (checklist e pop-ups)
        </span>
      </label>

      <div className="space-y-4">
        {steps.map((step, i) => (
          <div
            key={step.key}
            className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-zinc-400">{i + 1}</span>
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {step.label}
              </h3>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {step.guidance}
            </p>

            <div className="mt-3">
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                Etapas monitoradas
              </div>
              <div className="flex flex-wrap gap-2">
                {(options?.pipelines ?? []).flatMap((p) =>
                  p.stages.map((st) => {
                    const on = step.stageIds.includes(st.id);
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => toggleStage(step.key, st.id)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          on
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-zinc-300 text-zinc-500 hover:border-zinc-400 dark:border-zinc-700'
                        }`}
                      >
                        {p.name} · {st.name}
                      </button>
                    );
                  }),
                )}
                {(options?.pipelines ?? []).length === 0 && (
                  <span className="text-xs text-zinc-400">
                    Nenhum funil disponível.
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                Lead parado após
                <input
                  type="number"
                  min={0}
                  value={step.thresholdHours}
                  onChange={(e) =>
                    setSteps((prev) =>
                      prev.map((s) =>
                        s.key === step.key
                          ? { ...s, thresholdHours: e.target.value }
                          : s,
                      ),
                    )
                  }
                  className="w-16 rounded-md border border-zinc-300 px-2 py-1 text-right text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
                horas
              </label>
              <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={step.requireCheck}
                  onChange={(e) =>
                    setSteps((prev) =>
                      prev.map((s) =>
                        s.key === step.key
                          ? { ...s, requireCheck: e.target.checked }
                          : s,
                      ),
                    )
                  }
                  className="h-4 w-4 rounded border-zinc-300"
                />
                Exige conferência manual
              </label>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Salvar
      </button>
      <p className="text-[11px] text-zinc-400">
        Dica: o alerta de "lead parado" também dispara notificação in-app quando
        a etapa tem tempo de inatividade configurado (Funis → etapa).
      </p>
    </div>
  );
}
