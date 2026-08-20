'use client';

/**
 * Pop-up CENTRALIZADO da Rotina Comercial. Aparece sobre qualquer tela várias
 * vezes ao dia enquanto houver pendências, com um intervalo mínimo entre
 * exibições (throttle via localStorage). NÃO fecha sozinho e NÃO fecha clicando
 * fora — só sai pelo botão "Sair" (após o vendedor ler). Monitora em segundo
 * plano (poll a cada ~20min).
 */
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardCheck,
  AlertTriangle,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { routineService } from '../services/routine.service';

const POLL_MS = 20 * 60_000; // revalida a cada 20 min
const MIN_GAP_MS = 90 * 60_000; // no máx. 1 pop-up a cada 90 min
const NUDGE_KEY = 'routine.nudge.at';
const START_HOUR = 8; // só cutuca em horário comercial
const END_HOUR = 20;

export function RoutineNudge() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['routine', 'today'],
    queryFn: () => routineService.today(),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (open) return; // já está aberto
    if (!data || !data.enabled) return;
    if (pathname?.startsWith('/rotina')) return; // já está na rotina
    const { totalPending, totalParados, allDone } = data.summary;
    if (allDone || (totalPending === 0 && totalParados === 0)) return;

    const hour = new Date().getHours();
    if (hour < START_HOUR || hour >= END_HOUR) return;

    const last = Number(localStorage.getItem(NUDGE_KEY) || 0);
    if (Date.now() - last < MIN_GAP_MS) return;

    setOpen(true);
    localStorage.setItem(NUDGE_KEY, String(Date.now()));
  }, [data, open, pathname]);

  // Trava o scroll do fundo enquanto o modal está aberto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !data) return null;

  const { totalPending, totalParados } = data.summary;
  const pendentes = data.steps
    .filter((s) => !s.done && (s.pending > 0 || s.parados > 0))
    .slice(0, 6);

  const goToRoutine = () => {
    setOpen(false);
    router.push('/rotina');
  };

  const goToLeads = (stepKey: string | null, state: 'pending' | 'parado') => {
    setOpen(false);
    const q = new URLSearchParams({
      state,
      ...(stepKey ? { step: stepKey } : {}),
    });
    router.push(`/rotina/leads?${q.toString()}`);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
        {/* Cabeçalho */}
        <div className="flex items-center gap-3 border-b border-zinc-100 bg-primary/5 px-6 py-5 dark:border-zinc-800">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <ClipboardCheck className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Rotina Comercial
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Você tem pendências que precisam de ação.
            </p>
          </div>
        </div>

        {/* Corpo */}
        <div className="px-6 py-5">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => goToLeads(null, 'pending')}
              className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 transition hover:opacity-80 dark:bg-amber-900/30 dark:text-amber-300"
            >
              {totalPending} lead(s) aguardando ação
            </button>
            {totalParados > 0 && (
              <button
                type="button"
                onClick={() => goToLeads(null, 'parado')}
                className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:opacity-80 dark:bg-red-900/30 dark:text-red-300"
              >
                <AlertTriangle className="h-4 w-4" /> {totalParados} parado(s)
              </button>
            )}
          </div>

          <ul className="space-y-2">
            {pendentes.map((s) => (
              <li
                key={s.key}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3 py-2.5 dark:border-zinc-800"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-xs font-bold text-zinc-400">
                    {s.order}
                  </span>
                  <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {s.label}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {s.pending > 0 && (
                    <button
                      type="button"
                      onClick={() => goToLeads(s.key, 'pending')}
                      title="Ver estes leads"
                      className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-amber-800 transition hover:opacity-80 dark:bg-amber-900/30 dark:text-amber-300"
                    >
                      {s.pending}
                    </button>
                  )}
                  {s.parados > 0 && (
                    <button
                      type="button"
                      onClick={() => goToLeads(s.key, 'parado')}
                      title="Ver estes leads"
                      className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-red-800 transition hover:opacity-80 dark:bg-red-900/30 dark:text-red-300"
                    >
                      {s.parados} parados
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Rodapé — só sai por estes botões */}
        <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
          <button
            type="button"
            onClick={goToRoutine}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Ir para a rotina <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
