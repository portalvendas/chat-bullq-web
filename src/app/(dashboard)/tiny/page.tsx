'use client';

/**
 * Tela "Pedidos & Propostas" (Tiny ERP). Cards de totais no topo, abas
 * Pedidos/Orçamentos, cada linha com o LEAD vinculado e — no pedido — os
 * ITENS num subcampo expansível (buscados sob demanda no Tiny).
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingCart,
  FileText,
  ChevronRight,
  ChevronDown,
  Loader2,
  User,
  Phone,
  Link2Off,
} from 'lucide-react';
import {
  tinyService,
  type TinyOrderRow,
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
      <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-zinc-400">{sub}</div>}
    </div>
  );
}

/** Itens do documento — busca lazy ao expandir. */
function ItemsSubTable({ docId }: { docId: string }) {
  const { data: items, isLoading } = useQuery({
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
  if (!items || items.length === 0) {
    return <div className="px-4 py-3 text-xs text-zinc-400">Sem itens.</div>;
  }
  return (
    <div className="px-4 py-3">
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
              <td className="py-1.5 text-right font-medium tabular-nums">
                {brl(it.valorTotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrderRow({ row }: { row: TinyOrderRow }) {
  const [open, setOpen] = useState(false);
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
        <td className="py-2 pr-3">
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
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
              <Link2Off className="h-3.5 w-3.5" />
              {row.clienteNome ? `${row.clienteNome} (sem lead)` : 'sem lead'}
            </span>
          )}
        </td>
        <td className="py-2 pr-3 text-right font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
          {brl(row.valor)}
        </td>
      </tr>
      {open && (
        <tr className="bg-zinc-50/60 dark:bg-zinc-900/40">
          <td colSpan={6}>
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

  const { data: summary } = useQuery({
    queryKey: ['tiny-summary'],
    queryFn: () => tinyService.summary(),
    staleTime: 60_000,
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ['tiny-orders', tab, page],
    queryFn: () => tinyService.orders(tab, page, 30),
    staleTime: 30_000,
  });

  const switchTab = (t: 'PEDIDO' | 'ORCAMENTO') => {
    setTab(t);
    setPage(1);
  };

  const rows = orders?.items ?? [];
  const totalPages = orders?.pagination.totalPages ?? 1;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl p-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Pedidos &amp; Propostas
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Pedidos e propostas comerciais do Tiny ERP, vinculados aos leads do CRM.
        </p>

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
              Nenhum {tab === 'PEDIDO' ? 'pedido' : 'proposta'} encontrado.
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
                  <th className="py-2 pr-3 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <OrderRow key={row.id} row={row} />
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
