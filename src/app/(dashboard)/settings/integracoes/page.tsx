'use client';

/**
 * Configurações → Integrações. Hoje: conexão com o ERP Olist Tiny (OAuth),
 * estado da conexão, sincronização manual e desconexão. O sync automático
 * roda a cada 15min no backend; aqui é só o controle da conexão.
 */
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Plug, RefreshCw, Unplug, CheckCircle2 } from 'lucide-react';
import { tinyService } from '@/features/tiny/services/tiny.service';
import { MetaCapiCard } from '@/features/tiny/components/meta-capi-card';

function fmt(v?: string | null): string {
  if (!v) return 'nunca';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR');
}

export default function IntegracoesPage() {
  const qc = useQueryClient();
  const params = useSearchParams();

  const { data: status, isLoading } = useQuery({
    queryKey: ['tiny-status'],
    queryFn: () => tinyService.status(),
    staleTime: 15_000,
  });

  // Toast ao voltar do OAuth (callback redireciona com ?tiny=connected|error).
  useEffect(() => {
    const t = params.get('tiny');
    if (t === 'connected') {
      toast.success('Tiny conectado com sucesso');
      qc.invalidateQueries({ queryKey: ['tiny-status'] });
    } else if (t === 'error') {
      toast.error('Falha ao conectar o Tiny — tente novamente');
    }
  }, [params, qc]);

  const connect = useMutation({
    mutationFn: () => tinyService.startOAuth(),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: () => toast.error('Não foi possível iniciar a conexão'),
  });

  const sync = useMutation({
    mutationFn: () => tinyService.sync(),
    onSuccess: (r) => {
      toast.success(`Sincronizado: ${r.pedidos} pedidos, ${r.orcamentos} propostas`);
      qc.invalidateQueries({ queryKey: ['tiny-status'] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'Falha ao sincronizar'),
  });

  const disconnect = useMutation({
    mutationFn: () => tinyService.disconnect(),
    onSuccess: () => {
      toast.success('Tiny desconectado');
      qc.invalidateQueries({ queryKey: ['tiny-status'] });
    },
  });

  const connected = status?.connected;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Integrações
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Conecte sistemas externos ao Chat Bullq.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Plug className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                ERP Olist Tiny
              </h3>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                Traz pedidos e propostas comerciais do Tiny e vincula
                automaticamente aos leads do CRM (por CPF/CNPJ, telefone, e-mail
                ou nome). Sincroniza a cada 15 minutos.
              </p>

              {isLoading ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> carregando…
                </div>
              ) : connected ? (
                <div className="mt-3 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">
                      Conectado{status?.accountName ? ` — ${status.accountName}` : ''}
                    </span>
                  </div>
                  <div>Último sync de pedidos: {fmt(status?.lastPedidosSyncAt)}</div>
                  <div>Último sync de propostas: {fmt(status?.lastOrcamentosSyncAt)}</div>
                  {status?.lastError && (
                    <div className="text-red-500">Último erro: {status.lastError}</div>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-xs text-zinc-400">Não conectado.</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {!connected ? (
            <button
              onClick={() => connect.mutate()}
              disabled={connect.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {connect.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plug className="h-4 w-4" />
              )}
              Conectar Tiny
            </button>
          ) : (
            <>
              <button
                onClick={() => sync.mutate()}
                disabled={sync.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                {sync.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Sincronizar agora
              </button>
              <button
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
                className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:hover:bg-red-900/20"
              >
                <Unplug className="h-4 w-4" />
                Desconectar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Meta CAPI — só faz sentido com o Tiny conectado (fonte dos eventos) */}
      {connected && <MetaCapiCard />}
    </div>
  );
}
