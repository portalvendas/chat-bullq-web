'use client';

/** Detalhe da campanha: status, custo (estimado/real), ações e destinatários. */
import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Play, Pause, X } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import { disparosService, fmtBRL } from '@/features/disparos/services/disparos.service';

const REC_STATUS: Record<string, string> = {
  PENDING: 'Pendente', QUEUED: 'Na fila', SENT: 'Enviado',
  DELIVERED: 'Entregue', READ: 'Lido', FAILED: 'Falhou',
  SKIPPED: 'Ignorado', OPTED_OUT: 'Opt-out',
};

export default function DisparoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const { canEdit } = usePermissions();
  const podeDisparar = canEdit('disparos');
  const [recStatus, setRecStatus] = useState<string>('');

  const { data: b } = useQuery({
    queryKey: ['disparos', 'one', id],
    queryFn: () => disparosService.get(id),
    refetchInterval: (q) =>
      (q.state.data as any)?.status === 'RUNNING' ? 4000 : false,
  });
  const { data: recs } = useQuery({
    queryKey: ['disparos', 'recipients', id, recStatus],
    queryFn: () => disparosService.recipients(id, recStatus || undefined),
    enabled: !!b,
  });

  const act = useMutation({
    mutationFn: (a: 'start' | 'pause' | 'resume' | 'cancel') => disparosService.action(id, a),
    onSuccess: (updated) => {
      qc.setQueryData(['disparos', 'one', id], updated);
      qc.invalidateQueries({ queryKey: ['disparos', 'list'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Falha'),
  });

  if (!b) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" /> carregando…
      </div>
    );
  }

  const counts = b.recipientCounts ?? {};
  const real = Number(b.actualCostMicros) > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <Link href="/disparos" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800">
        <ArrowLeft className="h-4 w-4" /> Disparos
      </Link>

      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{b.name}</h1>
          <p className="text-sm text-zinc-400">
            {b.templateName} · {b.status}
          </p>
        </div>
        {podeDisparar && (
          <div className="flex gap-2">
            {['DRAFT', 'SCHEDULED'].includes(b.status) && (
              <Btn onClick={() => act.mutate('start')} icon={Play} label="Disparar" busy={act.isPending} />
            )}
            {b.status === 'RUNNING' && (
              <Btn onClick={() => act.mutate('pause')} icon={Pause} label="Pausar" busy={act.isPending} />
            )}
            {b.status === 'PAUSED' && (
              <Btn onClick={() => act.mutate('resume')} icon={Play} label="Retomar" busy={act.isPending} />
            )}
            {!['COMPLETED', 'CANCELLED'].includes(b.status) && (
              <Btn onClick={() => act.mutate('cancel')} icon={X} label="Cancelar" busy={act.isPending} danger />
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card label="Destinatários" value={String(b.estimatedRecipients)} />
        <Card label={real ? 'Custo real' : 'Custo estimado'} value={fmtBRL(real ? b.actualCostMicros : b.estimatedCostMicros)} />
        <Card label="Entregues" value={String((counts.DELIVERED ?? 0) + (counts.READ ?? 0))} />
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(counts).map(([s, n]) => (
          <button
            key={s}
            onClick={() => setRecStatus(recStatus === s ? '' : s)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${recStatus === s ? 'border-primary bg-primary/10 text-primary' : 'border-zinc-300 text-zinc-500 dark:border-zinc-700'}`}
          >
            {REC_STATUS[s] ?? s}: {n}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800">
        {(recs?.items ?? []).map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-2 text-sm last:border-0 dark:border-zinc-800">
            <div className="min-w-0">
              <div className="truncate text-zinc-800 dark:text-zinc-200">{r.contact.name || r.phoneE164}</div>
              {r.errorMessage && <div className="truncate text-[11px] text-red-500">{r.errorMessage}</div>}
            </div>
            <span className="shrink-0 text-xs text-zinc-400">{REC_STATUS[r.status] ?? r.status}</span>
          </div>
        ))}
        {!recs?.items.length && (
          <div className="px-4 py-6 text-center text-xs text-zinc-400">Sem destinatários neste filtro.</div>
        )}
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-3 text-center dark:border-zinc-800">
      <div className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{value}</div>
      <div className="text-[11px] uppercase text-zinc-400">{label}</div>
    </div>
  );
}
function Btn({ onClick, icon: Icon, label, busy, danger }: any) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 ${danger ? 'border border-red-300 text-red-600 hover:bg-red-50' : 'bg-primary text-white hover:opacity-90'}`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}
