'use client';

/**
 * Cutuca o vendedor várias vezes ao dia com um pop-up da Rotina Comercial
 * enquanto houver pendências. Monitora em segundo plano (poll a cada ~20min),
 * com intervalo mínimo entre pop-ups (throttle via localStorage) para não
 * incomodar. Não renderiza UI própria — usa o toast global.
 */
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { routineService } from '../services/routine.service';

const POLL_MS = 20 * 60_000; // revalida a cada 20 min
const MIN_GAP_MS = 90 * 60_000; // no máx. 1 pop-up a cada 90 min
const NUDGE_KEY = 'routine.nudge.at';
const START_HOUR = 8; // só cutuca em horário comercial
const END_HOUR = 20;

export function RoutineNudge() {
  const router = useRouter();
  const lastShownDay = useRef<string | null>(null);

  const { data } = useQuery({
    queryKey: ['routine', 'today'],
    queryFn: () => routineService.today(),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!data || !data.enabled) return;
    const { totalPending, totalParados, allDone, firstPendingKey } = data.summary;
    if (allDone || (totalPending === 0 && totalParados === 0)) return;

    const now = new Date();
    const hour = now.getHours();
    if (hour < START_HOUR || hour >= END_HOUR) return;

    // Throttle: respeita o intervalo mínimo entre pop-ups.
    const last = Number(localStorage.getItem(NUDGE_KEY) || 0);
    if (Date.now() - last < MIN_GAP_MS) return;

    const step = data.steps.find((s) => s.key === firstPendingKey);
    const title =
      totalParados > 0
        ? `⏰ ${totalParados} lead(s) parado(s) — hora de retomar`
        : 'Rotina comercial: você tem pendências';
    const body = step
      ? `Comece por: ${step.label} (${step.pending} pendente${
          step.pending === 1 ? '' : 's'
        }).`
      : `${totalPending} lead(s) aguardando ação.`;

    toast(title, {
      description: body,
      duration: 12_000,
      action: {
        label: 'Abrir rotina',
        onClick: () => router.push('/rotina'),
      },
    });
    localStorage.setItem(NUDGE_KEY, String(Date.now()));
    lastShownDay.current = data.day;
  }, [data, router]);

  return null;
}
