'use client';

/**
 * Transferir leads entre vendedores (OWNER/ADMIN), aberto pelo kanban.
 * Filtra os leads ABERTOS de um vendedor num período (opção: só os sem
 * contato humano), mostra a prévia com seleção e transfere card + conversa
 * para um vendedor de destino. Backend: GET/POST /pipelines/lead-transfer.
 */
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRightLeft, Loader2, Search, X } from 'lucide-react';
import { membersService } from '@/features/settings/services/members.service';
import { pipelinesService, type LeadTransferItem } from '../services/pipelines.service';

const NO_OWNER = '__none__';

type Preset = '7d' | '30d' | 'month' | 'all' | 'custom';
const PRESETS: { key: Preset; label: string }[] = [
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: 'month', label: 'Este mês' },
  { key: 'all', label: 'Tudo' },
  { key: 'custom', label: 'Personalizado' },
];

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Período em ISO (início do 1º dia → fim do último dia, horário local). */
function periodRange(p: Preset, from: string, to: string): { from?: string; to?: string } {
  const now = new Date();
  const startOf = (d: Date) => new Date(`${ymd(d)}T00:00:00`).toISOString();
  const endOf = (d: Date) => new Date(`${ymd(d)}T23:59:59`).toISOString();
  if (p === 'all') return {};
  if (p === '7d') return { from: startOf(new Date(now.getTime() - 6 * 86400000)), to: endOf(now) };
  if (p === '30d') return { from: startOf(new Date(now.getTime() - 29 * 86400000)), to: endOf(now) };
  if (p === 'month') return { from: startOf(new Date(now.getFullYear(), now.getMonth(), 1)), to: endOf(now) };
  return {
    ...(from ? { from: new Date(`${from}T00:00:00`).toISOString() } : {}),
    ...(to ? { to: new Date(`${to}T23:59:59`).toISOString() } : {}),
  };
}

const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleDateString('pt-BR') : '');
const fmtDateTime = (v: string | null) =>
  v
    ? new Date(v).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '';

function TempChip({ t }: { t: string | null }) {
  if (!t) return <span className="text-zinc-300 dark:text-zinc-600">—</span>;
  const cls =
    t === 'Quente'
      ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300'
      : t === 'Morno'
        ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
        : 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300';
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>{t}</span>;
}

export function LeadTransferDialog({
  defaultPipelineId,
  onClose,
  onDone,
}: {
  defaultPipelineId?: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersService.list(),
    staleTime: 60_000,
  });
  const { data: pipelines = [] } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => pipelinesService.list(),
    staleTime: 60_000,
  });
  const sellers = useMemo(
    () =>
      members
        .filter((m) => m.user?.isActive !== false)
        .map((m) => ({ id: m.userId, name: m.user?.name || m.user?.email || 'Sem nome' }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [members],
  );

  // Filtros (editáveis) e filtros APLICADOS (os que a prévia está mostrando).
  const [fromUserId, setFromUserId] = useState('');
  const [pipelineId, setPipelineId] = useState(defaultPipelineId ?? '');
  const [preset, setPreset] = useState<Preset>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [noHuman, setNoHuman] = useState(true);
  const [applied, setApplied] = useState<{
    fromUserId: string;
    pipelineId: string;
    noHuman: boolean;
    from?: string;
    to?: string;
  } | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toUserId, setToUserId] = useState('');

  const preview = useQuery({
    queryKey: ['lead-transfer-preview', applied],
    enabled: !!applied,
    queryFn: () =>
      pipelinesService.leadTransferPreview({
        fromUserId: applied!.fromUserId,
        from: applied!.from,
        to: applied!.to,
        noHumanContact: applied!.noHuman,
        pipelineId: applied!.pipelineId || undefined,
      }),
  });
  const items: LeadTransferItem[] = useMemo(() => preview.data?.items ?? [], [preview.data]);
  // Toda lista nova (busca ou recarga após transferir) vem com tudo marcado.
  useEffect(() => {
    setSelected(new Set(items.map((i) => i.id)));
  }, [items]);

  const search = () => {
    if (!fromUserId) {
      toast.error('Escolha o vendedor de origem');
      return;
    }
    const r = periodRange(preset, customFrom, customTo);
    setApplied({ fromUserId, pipelineId, noHuman, from: r.from, to: r.to });
    setToUserId('');
  };

  const transfer = useMutation({
    mutationFn: () =>
      pipelinesService.leadTransfer({
        cardIds: [...selected],
        toUserId,
        fromUserId: applied?.fromUserId,
      }),
    onSuccess: (r) => {
      const dest = sellers.find((s) => s.id === toUserId)?.name ?? 'o vendedor';
      toast.success(
        `${r.transferred} lead(s) transferido(s) para ${dest}` +
          (r.skipped.length ? ` · ${r.skipped.length} pulado(s)` : ''),
      );
      if (r.skipped.length) {
        const motivos = [...new Set(r.skipped.map((s) => s.reason))].join(', ');
        toast.message(`Pulados: ${motivos}`);
      }
      onDone();
      preview.refetch();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao transferir'),
  });

  const allChecked = items.length > 0 && selected.size === items.length;
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(items.map((i) => i.id)));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const fromName =
    applied?.fromUserId === NO_OWNER
      ? 'Sem vendedor'
      : sellers.find((s) => s.id === applied?.fromUserId)?.name;
  const destOptions = sellers.filter((s) => s.id !== applied?.fromUserId);
  const canTransfer = !!toUserId && selected.size > 0 && !transfer.isPending;

  const sel =
    'rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
              <ArrowRightLeft className="h-4 w-4" /> Transferir leads
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              Leads abertos de um vendedor passam (card e conversa) para outro vendedor assumir o atendimento.
            </p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filtros */}
        <div className="space-y-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Vendedor de origem
              <select value={fromUserId} onChange={(e) => setFromUserId(e.target.value)} className={`mt-1 w-full ${sel}`}>
                <option value="">Selecione…</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
                <option value={NO_OWNER}>Sem vendedor</option>
              </select>
            </label>
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Funil
              <select value={pipelineId} onChange={(e) => setPipelineId(e.target.value)} className={`mt-1 w-full ${sel}`}>
                <option value="">Todos os funis</option>
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">Entrada do lead:</span>
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  preset === p.key
                    ? 'bg-primary text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                {p.label}
              </button>
            ))}
            {preset === 'custom' && (
              <span className="flex items-center gap-1.5">
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className={sel} />
                <span className="text-xs text-zinc-400">até</span>
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className={sel} />
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
              <input
                type="checkbox"
                checked={noHuman}
                onChange={(e) => setNoHuman(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300"
              />
              Só leads <b>sem contato humano</b>
              <span className="text-xs text-zinc-400">(boas-vindas e follow-up automáticos não contam)</span>
            </label>
            <button
              onClick={search}
              disabled={preview.isFetching}
              className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {preview.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar leads
            </button>
          </div>
        </div>

        {/* Prévia */}
        <div className="min-h-[160px] flex-1 overflow-y-auto px-5 py-3">
          {!applied ? (
            <p className="py-10 text-center text-sm text-zinc-400">
              Escolha o vendedor de origem e o período e clique em <b>Buscar leads</b>.
            </p>
          ) : preview.isFetching && !preview.data ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" /> carregando…
            </div>
          ) : preview.isError ? (
            <p className="py-10 text-center text-sm text-red-500">Não foi possível carregar os leads.</p>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-400">Nenhum lead aberto encontrado com esses filtros.</p>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
                <span>
                  {items.length} lead(s) de <b>{fromName}</b>
                  {preview.data?.truncated && ' (mostrando os 1.000 mais recentes)'} · {selected.size} selecionado(s)
                </span>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white text-[11px] uppercase tracking-wide text-zinc-400 dark:bg-zinc-900">
                  <tr>
                    <th className="w-8 py-2">
                      <input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-4 w-4 rounded border-zinc-300" />
                    </th>
                    <th className="py-2">Lead</th>
                    <th className="py-2">Entrada</th>
                    <th className="py-2">Etapa</th>
                    <th className="py-2">Temp.</th>
                    <th className="py-2">Último contato humano</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {items.map((i) => (
                    <tr
                      key={i.id}
                      onClick={() => toggle(i.id)}
                      className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <td className="py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(i.id)}
                          onChange={() => toggle(i.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-zinc-300"
                        />
                      </td>
                      <td className="py-2">
                        <div className="max-w-[220px] truncate font-medium text-zinc-800 dark:text-zinc-100">
                          {i.contactName || i.title}
                        </div>
                        <div className="text-[11px] text-zinc-400">{i.phone || '—'}</div>
                      </td>
                      <td className="py-2 text-xs text-zinc-600 dark:text-zinc-300">{fmtDate(i.createdAt)}</td>
                      <td className="py-2 text-xs text-zinc-600 dark:text-zinc-300">
                        <div className="max-w-[200px] truncate">
                          {i.pipeline} › {i.stage}
                        </div>
                      </td>
                      <td className="py-2">
                        <TempChip t={i.temperature} />
                      </td>
                      <td className="py-2 text-xs">
                        {i.lastHumanAt ? (
                          <span className="text-zinc-600 dark:text-zinc-300">{fmtDateTime(i.lastHumanAt)}</span>
                        ) : (
                          <span className="font-medium text-amber-600">nunca</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Destino */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
            Transferir para
            <select
              value={toUserId}
              onChange={(e) => setToUserId(e.target.value)}
              disabled={!applied || items.length === 0}
              className={sel}
            >
              <option value="">Selecione o vendedor…</option>
              {destOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => {
              const dest = sellers.find((s) => s.id === toUserId)?.name;
              if (confirm(`Transferir ${selected.size} lead(s) de ${fromName} para ${dest}?`)) transfer.mutate();
            }}
            disabled={!canTransfer}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {transfer.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
            Transferir {selected.size > 0 ? `${selected.size} lead(s)` : 'leads'}
          </button>
        </div>
      </div>
    </div>
  );
}
