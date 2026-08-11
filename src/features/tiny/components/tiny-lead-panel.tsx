'use client';

/**
 * Painel "Tiny ERP" no lead: mostra os pedidos e orçamentos (propostas
 * comerciais) trazidos do Tiny e vinculados a este contato. Renderizado no
 * detalhe do card e no painel de contato do inbox, junto do LeadEnrichment.
 *
 * Silencioso quando não há nada: se o lead não tem documentos vinculados,
 * o componente não renderiza (não polui o painel de leads sem histórico Tiny).
 */
import { useQuery } from '@tanstack/react-query';
import { FileText, ShoppingCart, ExternalLink } from 'lucide-react';
import {
  tinyService,
  type TinyDocument,
} from '../services/tiny.service';

function brl(v: string | number | null): string {
  if (v == null) return '—';
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(v: string | null): string {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
}

/** Cor da tag de situação (verde = fechado/aprovado, âmbar = aberto, etc). */
function situacaoCls(s: string | null): string {
  const t = (s ?? '').toLowerCase();
  if (/aprovad|faturad|conclu|entregu|paga/.test(t))
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (/cancel|não aprov|nao aprov|não entreg/.test(t))
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
}

function DocRow({ doc }: { doc: TinyDocument }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs dark:border-zinc-700">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            {doc.kind === 'PEDIDO' ? 'Pedido' : 'Proposta'} #{doc.numero ?? doc.tinyId}
          </span>
          {doc.situacao && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${situacaoCls(doc.situacao)}`}>
              {doc.situacao}
            </span>
          )}
        </div>
        {doc.data && (
          <span className="text-[11px] text-zinc-400">{fmtDate(doc.data)}</span>
        )}
      </div>
      <span className="shrink-0 font-semibold text-zinc-700 dark:text-zinc-300">
        {brl(doc.valor)}
      </span>
    </div>
  );
}

export function TinyLeadPanel({ contactId }: { contactId?: string | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ['tiny-docs', contactId],
    queryFn: () => tinyService.documentsForContact(contactId as string),
    enabled: !!contactId,
    staleTime: 60_000,
  });

  if (!contactId || isLoading) return null;
  const pedidos = data?.pedidos ?? [];
  const orcamentos = data?.orcamentos ?? [];
  if (pedidos.length === 0 && orcamentos.length === 0) return null;

  return (
    <div className="mt-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        <ExternalLink className="h-3.5 w-3.5" />
        Tiny ERP
      </div>

      {orcamentos.length > 0 && (
        <div className="mb-2">
          <div className="mb-1 flex items-center gap-1 text-[11px] font-medium text-zinc-500">
            <FileText className="h-3 w-3" /> Propostas ({orcamentos.length})
          </div>
          <div className="space-y-1">
            {orcamentos.map((d) => (
              <DocRow key={d.id} doc={d} />
            ))}
          </div>
        </div>
      )}

      {pedidos.length > 0 && (
        <div>
          <div className="mb-1 flex items-center gap-1 text-[11px] font-medium text-zinc-500">
            <ShoppingCart className="h-3 w-3" /> Pedidos ({pedidos.length})
          </div>
          <div className="space-y-1">
            {pedidos.map((d) => (
              <DocRow key={d.id} doc={d} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
