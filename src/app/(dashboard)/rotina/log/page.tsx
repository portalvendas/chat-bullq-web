'use client';

/**
 * Rotina Comercial → Log gerencial (OWNER/ADMIN). Mostra quem executou o
 * checklist e quando: aderência recente por vendedor + grade dia × vendedor.
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import {
  routineService,
  type RoutineLogPerUser,
  type RoutineLogStatus,
} from '@/features/commercial-routine/services/routine.service';

/** 'YYYY-MM-DD' → 'DD/MM'. */
function br(day: string | null): string {
  if (!day) return '—';
  const [, m, d] = day.split('-');
  return `${d}/${m}`;
}

const STATUS: Record<
  RoutineLogStatus,
  { label: string; cls: string }
> = {
  today: {
    label: 'Executou hoje',
    cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  yesterday: {
    label: 'Executou ontem',
    cls: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  },
  stale: {
    label: 'Sem executar',
    cls: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  never: {
    label: 'Nunca executou',
    cls: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  },
};

export default function RotinaLogPage() {
  const { organizations, activeOrgId } = useAuthStore();
  const role = organizations.find((o) => o.id === activeOrgId)?.role;
  const isAdmin = role === 'OWNER' || role === 'ADMIN';

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['routine', 'log', from, to],
    queryFn: () => routineService.log(from || undefined, to || undefined),
    enabled: isAdmin,
    staleTime: 30_000,
  });

  const daysDesc = useMemo(
    () => (data ? [...data.history].reverse() : []),
    [data],
  );

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <ShieldAlert className="mx-auto h-8 w-8 text-zinc-300" />
          <h1 className="mt-3 text-base font-semibold text-zinc-800 dark:text-zinc-100">
            Acesso restrito
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            O log gerencial da rotina está disponível apenas para
            administradores.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto h-full max-w-5xl space-y-5 overflow-y-auto p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/rotina"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          <ArrowLeft className="h-4 w-4" /> Rotina
        </Link>
        <span className="text-zinc-300 dark:text-zinc-700">/</span>
        <h1 className="inline-flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          <BarChart3 className="h-5 w-5 text-primary" /> Log de execução
        </h1>
        {isFetching && (
          <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
        )}
        <div className="ml-auto flex items-center gap-2 text-sm">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          />
          <span className="text-zinc-400">até</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          />
          {(from || to) && (
            <button
              type="button"
              onClick={() => {
                setFrom('');
                setTo('');
              }}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              limpar
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 p-6 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" /> carregando log…
        </div>
      ) : !data ? null : (
        <>
          {!data.enabled && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-400">
              A rotina está desativada nas configurações — os dados abaixo são
              históricos.
            </div>
          )}

          <p className="text-xs text-zinc-400">
            Período {br(data.range.from)} a {br(data.range.to)} · marcações do
            checklist (de {data.stepsTotal} passos por dia)
          </p>

          {/* Aderência por vendedor */}
          <section className="space-y-2">
            {data.perUser.length === 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
                Nenhum vendedor aplicável à rotina.
              </div>
            ) : (
              data.perUser.map((u) => <UserRow key={u.userId} u={u} />)
            )}
          </section>

          {/* Grade dia × vendedor */}
          {data.users.length > 0 && daysDesc.length > 0 && (
            <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-zinc-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:border-zinc-800">
                Histórico diário
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-xs text-zinc-400">
                      <th className="sticky left-0 bg-white px-4 py-2 font-medium dark:bg-zinc-900">
                        Dia
                      </th>
                      {data.users.map((u) => (
                        <th
                          key={u.id}
                          className="px-3 py-2 text-center font-medium"
                          title={u.name}
                        >
                          <span className="block max-w-[7rem] truncate">
                            {u.name}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {daysDesc.map((row) => {
                      const byUser = new Map(
                        row.perUser.map((p) => [p.userId, p.count]),
                      );
                      return (
                        <tr
                          key={row.day}
                          className="border-t border-zinc-100 dark:border-zinc-800"
                        >
                          <td className="sticky left-0 bg-white px-4 py-1.5 text-xs font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                            {br(row.day)}
                          </td>
                          {data.users.map((u) => {
                            const c = byUser.get(u.id) ?? 0;
                            return (
                              <td key={u.id} className="px-3 py-1.5 text-center">
                                {c > 0 ? (
                                  <span
                                    className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                    title={`${c} passo(s) marcado(s)`}
                                  >
                                    {c}
                                  </span>
                                ) : (
                                  <span className="text-zinc-300 dark:text-zinc-700">
                                    ·
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function UserRow({ u }: { u: RoutineLogPerUser }) {
  const st = STATUS[u.status];
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {u.name}
          </span>
          {!u.isActive && (
            <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 dark:bg-zinc-800">
              inativo
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-zinc-400">
          Última execução: {br(u.lastDay)}
        </p>
      </div>

      <div className="flex items-center gap-4 text-center">
        <div>
          <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            {u.daysActive}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-zinc-400">
            dias ativos
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            {u.totalChecks}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-zinc-400">
            marcações
          </div>
        </div>
      </div>

      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${st.cls}`}
      >
        {u.status === 'today' && <CheckCircle2 className="h-3.5 w-3.5" />}
        {st.label}
      </span>
    </div>
  );
}
