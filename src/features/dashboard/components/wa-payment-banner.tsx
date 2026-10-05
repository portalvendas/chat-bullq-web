'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { CreditCard } from 'lucide-react';
import { dashboardService } from '@/features/dashboard/services/dashboard.service';

/**
 * Banner global de BLOQUEIO DE PAGAMENTO da WhatsApp Oficial (Meta erro 131042
 * "Business eligibility payment issue"). Quando a cobrança da WABA falha, a
 * Meta recusa TODA mensagem (template e texto) — fica o relógio na conversa e
 * ninguém envia nada sem perceber. Este banner torna isso impossível de passar
 * batido: aparece em QUALQUER tela (fica no layout, acima do Inbox também).
 *
 * Fonte: GET /dashboard/wa-health → paymentBlock.active (houve recusa por
 * pagamento nos últimos 90 min). Some sozinho ~90 min depois que o pagamento é
 * ajustado e os envios voltam a passar. Poll a cada 60s.
 */
export function WaPaymentBanner() {
  const { data } = useQuery({
    queryKey: ['dashboard', 'wa-health'],
    queryFn: () => dashboardService.getWaHealth(),
    refetchInterval: 60_000,
    staleTime: 55_000,
  });

  const block = data?.paymentBlock;

  const headline = useMemo(() => {
    if (!block?.active) return null;
    const names = block.channels
      .filter((c) => c.recentCount > 0)
      .map((c) => c.name)
      .filter(Boolean);
    const quais =
      names.length === 0
        ? 'WhatsApp Oficial'
        : names.length <= 2
          ? names.join(' e ')
          : `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
    return `Meta bloqueou os envios por problema de pagamento — ${quais}`;
  }, [block]);

  if (!block?.active) return null;

  return (
    <div className="border-b border-red-300 bg-red-600 px-6 py-2.5 text-white">
      <div className="flex items-center gap-3">
        <CreditCard className="h-4 w-4 flex-shrink-0" />
        <div className="flex-1 text-sm">
          <span className="font-semibold">{headline}</span>
          <span className="ml-2 text-red-100">
            · {block.recentTotal} mensagem(ns) recusada(s) agora (erro 131042). Ajuste a
            forma de pagamento no Gerenciador da Meta — nenhuma mensagem sai até resolver.
          </span>
        </div>
        <a
          href="https://business.facebook.com/billing_hub/accounts"
          target="_blank"
          rel="noopener noreferrer"
          className="whitespace-nowrap rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
        >
          Abrir faturamento da Meta
        </a>
        <Link
          href="/dashboard?tab=custos"
          className="whitespace-nowrap rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700"
        >
          Ver detalhes
        </Link>
      </div>
    </div>
  );
}
