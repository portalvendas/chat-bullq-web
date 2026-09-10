'use client';

/**
 * Tela "Pedidos & Propostas" (Tiny ERP). Filtro de período, cards de totais +
 * card por vendedor, abas Pedidos/Propostas com o LEAD vinculado e os ITENS
 * num subcampo expansível (buscados sob demanda no Tiny).
 *
 * Regra de negócio (padrão): pedidos = só venda efetiva — exclui Cancelado/
 * Dados Incompletos, exclui origem marketplace (ML/Shopee/Magalu/Amazon) e só
 * natureza de operação "Venda". Aplicado no backend.
 */
import { useState, useEffect, type MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingCart,
  FileText,
  ChevronRight,
  ChevronDown,
  Loader2,
  User,
  Phone,
  Link2Off,
  Link2,
  Search,
  X,
  Users,
  MessageSquare,
  PhoneCall,
  Pencil,
} from 'lucide-react';
import {
  tinyService,
  type TinyOrderRow,
  type TinyPeriod,
  type TinyVendors,
} from '@/features/tiny/services/tiny.service';

function brl(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtDate(v: string | null): string {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
}
function situacaoCls(s: string | null): string {
  const t = (s ?? '').toLowerCase();
  if (/aprovad|faturad|conclu|entregu|paga/.test(t))
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (/cancel|não aprov|nao aprov|não entreg/.test(t))
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
}

// ── Períodos ─────────────────────────────────────────────────────────
type PeriodKey = 'hoje' | 'ontem' | '7d' | '30d' | 'mes' | 'tudo' | 'custom';
const PERIOD_LABELS: Record<PeriodKey, string> = {
  hoje: 'Hoje',
  ontem: 'Ontem',
  '7d': '7 dias',
  '30d': '30 dias',
  mes: 'Este mês',
  tudo: 'Tudo',
  custom: 'Personalizado',
};
function periodRange(k: PeriodKey, customFrom?: string, customTo?: string): TinyPeriod {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
  switch (k) {
    case 'hoje':
      return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
    case 'ontem': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y).toISOString(), to: endOfDay(y).toISOString() };
    }
    case '7d': {
      const s = new Date(now);
      s.setDate(s.getDate() - 6);
      return { from: startOfDay(s).toISOString(), to: endOfDay(now).toISOString() };
    }
    case '30d': {
      const s = new Date(now);
      s.setDate(s.getDate() - 29);
      return { from: startOfDay(s).toISOString(), to: endOfDay(now).toISOString() };
    }
    case 'mes': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: startOfDay(s).toISOString(), to: endOfDay(now).toISOString() };
    }
    case 'custom': {
      if (!customFrom || !customTo) return {};
      const f = new Date(`${customFrom}T00:00:00`);
      const t = new Date(`${customTo}T00:00:00`);
      if (isNaN(f.getTime()) || isNaN(t.getTime())) return {};
      const [a, b] = f <= t ? [f, t] : [t, f];
      return { from: startOfDay(a).toISOString(), to: endOfDay(b).toISOString() };
    }
    default:
      return {};
  }
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof ShoppingCart;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-zinc-400">{sub}</div>}
    </div>
  );
}

/** Linha de resumo (label + valor) no rodapé dos itens. */
function ResumoLinha({
  label,
  note,
  value,
  strong,
}: {
  label: string;
  /** Texto discreto ao lado do label (ex.: "12%"). */
  note?: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${
        strong ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'
      }`}
    >
      <span>
        {label}
        {note && <span className="ml-1 text-zinc-400">({note})</span>}
      </span>
      <span className={`tabular-nums ${strong ? 'font-bold' : 'font-medium'}`}>{value}</span>
    </div>
  );
}

/** Linha de resumo com valor textual (forma de recebimento, conta, etc.). */
function ResumoInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-zinc-500">
      <span>{label}</span>
      <span className="truncate text-right font-medium text-zinc-700 dark:text-zinc-300">
        {value}
      </span>
    </div>
  );
}

/** Itens do documento + resumo financeiro — busca lazy ao expandir. */
function ItemsSubTable({ docId }: { docId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['tiny-items', docId],
    queryFn: () => tinyService.items(docId),
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 text-xs text-zinc-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> carregando itens…
      </div>
    );
  }
  const items = data?.items ?? [];
  const r = data?.resumo;
  if (items.length === 0 && !r?.total) {
    return <div className="px-4 py-3 text-xs text-zinc-400">Sem itens.</div>;
  }
  return (
    <div className="px-4 py-3">
      {items.length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wide text-zinc-400">
              <th className="pb-1 font-medium">Produto</th>
              <th className="pb-1 text-right font-medium">Qtd</th>
              <th className="pb-1 text-right font-medium">Unit.</th>
              <th className="pb-1 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="text-zinc-700 dark:text-zinc-300">
            {items.map((it, i) => (
              <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="py-1.5">
                  {it.descricao}
                  {it.sku && <span className="ml-1 text-zinc-400">({it.sku})</span>}
                </td>
                <td className="py-1.5 text-right tabular-nums">{it.quantidade}</td>
                <td className="py-1.5 text-right tabular-nums">{brl(it.valorUnitario)}</td>
                <td className="py-1.5 text-right font-medium tabular-nums">{brl(it.valorTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Resumo financeiro do pedido */}
      {r && (
        <div className="ml-auto mt-3 max-w-xs space-y-1 border-t border-zinc-200 pt-2 text-xs dark:border-zinc-700">
          {r.totalProdutos != null && (
            <ResumoLinha label="Produtos" value={brl(r.totalProdutos)} />
          )}
          {r.desconto != null && r.desconto > 0 && (
            <ResumoLinha
              label="Desconto"
              note={
                r.descontoPercent && r.descontoPercent > 0
                  ? `${r.descontoPercent.toLocaleString('pt-BR', {
                      maximumFractionDigits: 2,
                    })}%`
                  : undefined
              }
              value={`- ${brl(r.desconto)}`}
            />
          )}
          {r.frete != null && r.frete > 0 && (
            <ResumoLinha label="Frete" value={brl(r.frete)} />
          )}
          {r.outrasDespesas != null && r.outrasDespesas > 0 && (
            <ResumoLinha label="Outras despesas" value={brl(r.outrasDespesas)} />
          )}
          {r.total != null && (
            <ResumoLinha label="Total do pedido" value={brl(r.total)} strong />
          )}
          {r.condicaoPagamento && (
            <div className="flex items-center justify-between pt-1 text-zinc-500">
              <span>Pagamento</span>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {r.condicaoPagamento}
              </span>
            </div>
          )}
          {(r.formaRecebimento || r.meioPagamento || r.contaBancaria) && (
            <div className="mt-1 space-y-1 border-t border-zinc-100 pt-1 dark:border-zinc-800">
              {r.formaRecebimento && (
                <ResumoInfo
                  label="Forma de recebimento"
                  value={
                    r.meioPagamento
                      ? `${r.formaRecebimento} · ${r.meioPagamento}`
                      : r.formaRecebimento
                  }
                />
              )}
              {r.contaBancaria && (
                <ResumoInfo label="Conta bancária" value={r.contaBancaria} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Popover de busca pra vincular MANUALMENTE um lead ao pedido/orçamento quando
 * o match automático não achou. Busca por nome/telefone/CPF/e-mail.
 */
function LeadLinker({
  docId,
  defaultQuery,
  onClose,
  onLinked,
}: {
  docId: string;
  defaultQuery: string;
  onClose: () => void;
  onLinked: () => void;
}) {
  const [q, setQ] = useState(defaultQuery);
  const [debounced, setDebounced] = useState(defaultQuery.trim());
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  const { data: results, isFetching } = useQuery({
    queryKey: ['tiny-lead-search', debounced],
    queryFn: () => tinyService.searchLeads(debounced),
    enabled: debounced.length >= 2,
    staleTime: 30_000,
  });
  const linkMut = useMutation({
    mutationFn: (contactId: string) => tinyService.setLead(docId, contactId),
    onSuccess: () => {
      onLinked();
      onClose();
    },
  });
  return (
    <div
      className="absolute left-0 top-full z-20 mt-1 w-72 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-2 py-1 dark:border-zinc-700">
        <Search className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nome, telefone, CPF ou e-mail…"
          className="w-full bg-transparent text-xs text-zinc-800 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
        />
        <button type="button" onClick={onClose} title="Fechar">
          <X className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200" />
        </button>
      </div>
      <div className="mt-1 max-h-56 overflow-y-auto">
        {debounced.length < 2 ? (
          <p className="px-2 py-3 text-[11px] text-zinc-400">Digite ao menos 2 caracteres.</p>
        ) : isFetching ? (
          <p className="flex items-center gap-1 px-2 py-3 text-[11px] text-zinc-400">
            <Loader2 className="h-3 w-3 animate-spin" /> buscando…
          </p>
        ) : results && results.length > 0 ? (
          results.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={linkMut.isPending}
              onClick={() => linkMut.mutate(c.id)}
              className="flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left hover:bg-zinc-100 disabled:opacity-60 dark:hover:bg-zinc-800"
            >
              <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                {c.name || '(sem nome)'}
              </span>
              <span className="text-[10px] text-zinc-400">
                {[c.phone, c.email].filter(Boolean).join(' · ') || '—'}
              </span>
            </button>
          ))
        ) : (
          <p className="px-2 py-3 text-[11px] text-zinc-400">Nenhum lead encontrado.</p>
        )}
      </div>
      {linkMut.isError && (
        <p className="px-2 pt-1 text-[10px] text-red-500">Falha ao vincular. Tente de novo.</p>
      )}
    </div>
  );
}

function OrderRow({
  row,
  vendorOptions,
}: {
  row: TinyOrderRow;
  vendorOptions?: TinyVendors;
}) {
  const [open, setOpen] = useState(false);
  const [linking, setLinking] = useState(false);
  const [editingVend, setEditingVend] = useState(false);
  const qc = useQueryClient();
  const vendMut = useMutation({
    mutationFn: (v: string | null) => tinyService.setVendedor(row.id, v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tiny-orders'] });
      qc.invalidateQueries({ queryKey: ['tiny-summary'] });
      qc.invalidateQueries({ queryKey: ['tiny-vendors'] });
      setEditingVend(false);
    },
  });
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['tiny-orders'] });
    qc.invalidateQueries({ queryKey: ['tiny-summary'] });
  };
  const unlinkMut = useMutation({
    mutationFn: () => tinyService.setLead(row.id, null),
    onSuccess: () => invalidateAll(),
  });
  const router = useRouter();
  const [calling, setCalling] = useState(false);
  const [callErr, setCallErr] = useState<string | null>(null);

  // "Chamar": resolve (ou inicia) a conversa do lead e navega pro inbox.
  async function handleChamar(e: MouseEvent) {
    e.stopPropagation();
    if (calling) return;
    setCalling(true);
    setCallErr(null);
    try {
      const { conversationId } = await tinyService.openConversation(row.id);
      router.push(`/inbox?conversationId=${conversationId}`);
    } catch (err: any) {
      setCallErr(
        err?.response?.data?.message || 'Não foi possível abrir a conversa.',
      );
      setCalling(false);
    }
  }

  return (
    <>
      <tr
        className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40"
        onClick={() => setOpen((o) => !o)}
      >
        <td className="py-2 pl-2 pr-1 align-middle">
          {open ? (
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-zinc-400" />
          )}
        </td>
        <td className="py-2 pr-3 font-medium text-zinc-800 dark:text-zinc-200">
          #{row.numero ?? row.tinyId}
        </td>
        <td className="py-2 pr-3">
          {row.situacao && (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${situacaoCls(row.situacao)}`}>
              {row.situacao}
            </span>
          )}
        </td>
        <td className="py-2 pr-3 text-xs text-zinc-500">{fmtDate(row.data)}</td>
        <td className="relative py-2 pr-3">
          {row.lead ? (
            <div className="flex flex-col">
              <span className="inline-flex items-center gap-1 text-sm text-zinc-800 dark:text-zinc-200">
                <User className="h-3.5 w-3.5 text-zinc-400" />
                {row.lead.name || 'Lead'}
              </span>
              {row.lead.phone && (
                <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
                  <Phone className="h-3 w-3" /> {row.lead.phone}
                </span>
              )}
              {row.lead.conversationId ? (
                <Link
                  href={`/inbox?conversationId=${row.lead.conversationId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-0.5 inline-flex w-fit items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                >
                  <MessageSquare className="h-3 w-3" /> Ver conversa
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleChamar}
                    disabled={calling}
                    className="mt-0.5 inline-flex w-fit items-center gap-1 text-[11px] font-medium text-emerald-600 hover:underline disabled:opacity-60 dark:text-emerald-400"
                    title="Procurar uma conversa deste lead ou iniciar uma nova no WhatsApp"
                  >
                    {calling ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <PhoneCall className="h-3 w-3" />
                    )}
                    {calling ? 'Abrindo…' : 'Chamar'}
                  </button>
                  {callErr && (
                    <span className="text-[10px] text-red-500">{callErr}</span>
                  )}
                </>
              )}
              <div
                className="mt-0.5 flex items-center gap-2 text-[10px] text-zinc-400"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setLinking(true)}
                  className="hover:text-zinc-600 hover:underline dark:hover:text-zinc-300"
                >
                  trocar
                </button>
                <span>·</span>
                <button
                  type="button"
                  disabled={unlinkMut.isPending}
                  onClick={() => unlinkMut.mutate()}
                  className="hover:text-red-500 hover:underline disabled:opacity-60"
                >
                  desvincular
                </button>
              </div>
            </div>
          ) : (
            <div
              className="flex flex-col gap-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                <Link2Off className="h-3.5 w-3.5" />
                {row.clienteNome ? `${row.clienteNome} (sem lead)` : 'sem lead'}
              </span>
              <button
                type="button"
                onClick={() => setLinking(true)}
                className="inline-flex w-fit items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                <Link2 className="h-3 w-3" /> Vincular lead
              </button>
            </div>
          )}
          {linking && (
            <LeadLinker
              docId={row.id}
              defaultQuery={row.clienteNome ?? ''}
              onClose={() => setLinking(false)}
              onLinked={invalidateAll}
            />
          )}
        </td>
        <td
          className="py-2 pr-3 text-xs tabular-nums text-zinc-500"
          title="Dias entre a data do orçamento/pedido e a última mensagem enviada ao cliente"
        >
          {row.diasOrcamentoUltimaMsg == null
            ? '—'
            : `${row.diasOrcamentoUltimaMsg} d`}
        </td>
        <td
          className="py-2 pr-3 text-xs text-zinc-500"
          onClick={(e) => e.stopPropagation()}
        >
          {editingVend ? (
            <select
              autoFocus
              defaultValue={row.vendedor ?? ''}
              disabled={vendMut.isPending}
              onChange={(e) => vendMut.mutate(e.target.value || null)}
              onBlur={() => setEditingVend(false)}
              className="rounded-md border border-zinc-300 bg-white px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
            >
              <option value="">Sem vendedor</option>
              {(vendorOptions?.vendedores ?? []).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
              {row.vendedor &&
                !(vendorOptions?.vendedores ?? []).includes(row.vendedor) && (
                  <option value={row.vendedor}>{row.vendedor}</option>
                )}
            </select>
          ) : (
            <button
              type="button"
              onClick={() => setEditingVend(true)}
              className="group inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Editar vendedor"
            >
              {vendMut.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Pencil className="h-3 w-3 text-zinc-300 group-hover:text-zinc-500" />
              )}
              {row.vendedor || '—'}
            </button>
          )}
        </td>
        <td className="py-2 pr-3 text-right font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
          {brl(row.valor)}
        </td>
      </tr>
      {open && (
        <tr className="bg-zinc-50/60 dark:bg-zinc-900/40">
          <td colSpan={8}>
            <ItemsSubTable docId={row.id} />
          </td>
        </tr>
      )}
    </>
  );
}

export default function TinyOrdersPage() {
  const [tab, setTab] = useState<'PEDIDO' | 'ORCAMENTO'>('PEDIDO');
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<PeriodKey>('tudo');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [vendedor, setVendedor] = useState(''); // '' = todos; '__sem__' = sem vendedor
  const range = periodRange(period, customFrom, customTo);

  const { data: summary } = useQuery({
    queryKey: ['tiny-summary', period, customFrom, customTo, vendedor],
    queryFn: () => tinyService.summary(range, vendedor || undefined),
    staleTime: 60_000,
  });

  // Opcoes do dropdown de vendedor -- independem do vendedor selecionado.
  const { data: vendorOptions } = useQuery({
    queryKey: ['tiny-vendors', period, customFrom, customTo],
    queryFn: () => tinyService.vendors(range),
    staleTime: 60_000,
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ['tiny-orders', tab, page, period, customFrom, customTo, vendedor],
    queryFn: () => tinyService.orders(tab, page, 30, range, vendedor || undefined),
    staleTime: 30_000,
  });

  const switchTab = (t: 'PEDIDO' | 'ORCAMENTO') => {
    setTab(t);
    setPage(1);
  };
  const switchPeriod = (p: PeriodKey) => {
    if (p === 'custom' && (!customFrom || !customTo)) {
      const now = new Date();
      const s = new Date(now);
      s.setDate(s.getDate() - 29);
      const iso = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      setCustomFrom(iso(s));
      setCustomTo(iso(now));
    }
    setPeriod(p);
    setPage(1);
  };

  const rows = orders?.items ?? [];
  const totalPages = orders?.pagination.totalPages ?? 1;
  const vendors = summary?.porVendedor ?? [];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Pedidos &amp; Propostas
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Vendas efetivas do Tiny ERP (sem marketplace/cancelados) vinculadas aos leads.
            </p>
          </div>
          {/* Filtro de período */}
          <div className="flex flex-wrap gap-1 rounded-lg border border-zinc-200 p-1 dark:border-zinc-800">
            {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((k) => (
              <button
                key={k}
                onClick={() => switchPeriod(k)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  period === k
                    ? 'bg-primary text-white'
                    : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {PERIOD_LABELS[k]}
              </button>
            ))}
          </div>
          {/* Filtro por vendedor */}
          <select
            value={vendedor}
            onChange={(e) => {
              setVendedor(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
          >
            <option value="">Todos os vendedores</option>
            {(vendorOptions?.vendedores ?? []).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
            {vendorOptions?.hasSemVendedor && <option value="__sem__">Sem vendedor</option>}
          </select>
          {period === 'custom' && (
            <div className="flex w-full flex-wrap justify-end gap-2">
              <label className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                De
                <input
                  type="date"
                  value={customFrom}
                  max={customTo || undefined}
                  onChange={(e) => {
                    setCustomFrom(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                />
              </label>
              <label className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                Até
                <input
                  type="date"
                  value={customTo}
                  min={customFrom || undefined}
                  onChange={(e) => {
                    setCustomTo(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                />
              </label>
            </div>
          )}
        </div>

        {/* Cards de totais */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={ShoppingCart}
            label="Total em pedidos"
            value={brl(summary?.pedidos.total ?? 0)}
            sub={`${summary?.pedidos.count ?? 0} pedidos`}
          />
          <StatCard
            icon={FileText}
            label="Total em propostas"
            value={brl(summary?.orcamentos.total ?? 0)}
            sub={`${summary?.orcamentos.count ?? 0} propostas`}
          />
          <StatCard
            icon={ShoppingCart}
            label="Qtd. de pedidos"
            value={String(summary?.pedidos.count ?? 0)}
          />
          <StatCard
            icon={FileText}
            label="Qtd. de propostas"
            value={String(summary?.orcamentos.count ?? 0)}
          />
        </div>

        {/* Card por vendedor */}
        {vendors.length > 0 && (
          <div className="mt-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              <Users className="h-4 w-4" /> Por vendedor
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wide text-zinc-400">
                  <tr>
                    <th className="pb-2 pr-3 font-medium">Vendedor</th>
                    <th className="pb-2 pr-3 text-right font-medium">Pedidos</th>
                    <th className="pb-2 pr-3 text-right font-medium">R$ pedidos</th>
                    <th className="pb-2 pr-3 text-right font-medium">Propostas</th>
                    <th className="pb-2 text-right font-medium">R$ propostas</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-700 dark:text-zinc-300">
                  {vendors.map((v) => (
                    <tr key={v.vendedor} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="py-1.5 pr-3 font-medium text-zinc-800 dark:text-zinc-200">
                        {v.vendedor}
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{v.pedidosCount}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{brl(v.pedidosTotal)}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{v.propostasCount}</td>
                      <td className="py-1.5 text-right tabular-nums">{brl(v.propostasTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Abas */}
        <nav className="mt-8 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
          {(
            [
              { k: 'PEDIDO', label: 'Pedidos', Icon: ShoppingCart },
              { k: 'ORCAMENTO', label: 'Propostas', Icon: FileText },
            ] as const
          ).map(({ k, label, Icon }) => (
            <button
              key={k}
              onClick={() => switchTab(k)}
              className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                tab === k
                  ? 'border-primary text-primary'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        {/* Tabela */}
        <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-sm text-zinc-400">
              Nenhum {tab === 'PEDIDO' ? 'pedido' : 'proposta'} no período.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-[11px] uppercase tracking-wide text-zinc-400 dark:bg-zinc-900/50">
                <tr>
                  <th className="w-8 py-2 pl-2" />
                  <th className="py-2 pr-3 font-medium">Número</th>
                  <th className="py-2 pr-3 font-medium">Situação</th>
                  <th className="py-2 pr-3 font-medium">Data</th>
                  <th className="py-2 pr-3 font-medium">Lead vinculado</th>
                  <th className="py-2 pr-3 font-medium" title="Dias entre a data do orçamento/pedido e a última mensagem enviada ao cliente">Dias (orç.→últ. msg)</th>
                  <th className="py-2 pr-3 font-medium">Vendedor</th>
                  <th className="py-2 pr-3 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <OrderRow key={row.id} row={row} vendorOptions={vendorOptions} />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-zinc-400">
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border border-zinc-200 px-3 py-1.5 disabled:opacity-40 dark:border-zinc-700"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-md border border-zinc-200 px-3 py-1.5 disabled:opacity-40 dark:border-zinc-700"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
