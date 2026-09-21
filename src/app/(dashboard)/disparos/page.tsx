'use client';

/**
 * Disparos em massa — lista de campanhas + barra de teto. Ver = qualquer um com
 * permissão 'disparos'; criar/importar = quem tem 'edit'.
 */
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Megaphone, Plus, Upload, Loader2 } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import {
  disparosService,
  fmtBRL,
  microsToBRL,
  type Broadcast,
} from '@/features/disparos/services/disparos.service';

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Rascunho', cls: 'bg-zinc-100 text-zinc-600' },
  SCHEDULED: { label: 'Agendado', cls: 'bg-blue-100 text-blue-700' },
  RUNNING: { label: 'Enviando', cls: 'bg-amber-100 text-amber-700' },
  PAUSED: { label: 'Pausado', cls: 'bg-orange-100 text-orange-700' },
  COMPLETED: { label: 'Concluído', cls: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Cancelado', cls: 'bg-zinc-200 text-zinc-600' },
  FAILED: { label: 'Falhou', cls: 'bg-red-100 text-red-700' },
};

export default function DisparosPage() {
  const { canEdit } = usePermissions();
  const podeDisparar = canEdit('disparos');

  const { data: budget } = useQuery({
    queryKey: ['disparos', 'budget'],
    queryFn: () => disparosService.budget(),
    staleTime: 30_000,
  });
  const { data, isLoading } = useQuery({
    queryKey: ['disparos', 'list'],
    queryFn: () => disparosService.list(),
    staleTime: 15_000,
  });

  const pct =
    budget?.hasCap && Number(budget.capMicros) > 0
      ? Math.min(
          100,
          (microsToBRL(budget.committedMicros) / microsToBRL(budget.capMicros)) *
            100,
        )
      : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Megaphone className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Disparos em massa
        </h1>
        {podeDisparar && (
          <div className="ml-auto flex gap-2">
            <Link
              href="/disparos/importar"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200"
            >
              <Upload className="h-4 w-4" /> Importar contatos
            </Link>
            <Link
              href="/disparos/novo"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Novo disparo
            </Link>
          </div>
        )}
      </div>

      {budget?.hasCap && (
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-200">
              Teto {budget.period === 'MONTHLY' ? 'mensal' : 'total'}
            </span>
            <span className="text-zinc-500">
              {fmtBRL(budget.committedMicros)} de {fmtBRL(budget.capMicros)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : 'bg-primary'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 text-[11px] text-zinc-400">
            Disponível: {fmtBRL(budget.availableMicros)} · Cobrado no período:{' '}
            {fmtBRL(budget.chargedMicros)}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 p-6 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" /> carregando…
        </div>
      ) : !data?.items.length ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-400 dark:border-zinc-700">
          Nenhum disparo ainda.
        </div>
      ) : (
        <div className="space-y-2">
          {data.items.map((b) => (
            <BroadcastRow key={b.id} b={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function BroadcastRow({ b }: { b: Broadcast }) {
  const st = STATUS_LABEL[b.status] ?? { label: b.status, cls: 'bg-zinc-100' };
  const cost = b.actualCostMicros && Number(b.actualCostMicros) > 0
    ? b.actualCostMicros
    : b.estimatedCostMicros;
  return (
    <Link
      href={`/disparos/${b.id}`}
      className="flex items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {b.name}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.cls}`}>
            {st.label}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-zinc-400">
          {b.templateName} · {b.estimatedRecipients} destinatário(s)
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-medium tabular-nums text-zinc-700 dark:text-zinc-200">
          {fmtBRL(cost)}
        </div>
        <div className="text-[11px] text-zinc-400">
          {b.actualCostMicros && Number(b.actualCostMicros) > 0 ? 'real' : 'estimado'}
        </div>
      </div>
    </Link>
  );
}
