'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Loader2, CheckCircle2, RefreshCw, Smartphone } from 'lucide-react';
import { channelsService } from '../services/channels.service';

/**
 * Pareamento por QR DENTRO do CRM (WhatsApp não-oficial: Zappfy/Uazapi e Z-API).
 * Faz polling do endpoint /channels/:id/qr: mostra o QR até o status virar
 * `connected`, então exibe sucesso. Igual ao fluxo "Escaneie para entrar".
 */
export function ChannelQrDialog({
  channelId,
  channelName,
  onClose,
  onConnected,
}: {
  channelId: string;
  channelName: string;
  onClose: () => void;
  onConnected?: () => void;
}) {
  const [connected, setConnected] = useState(false);
  const firedRef = useRef(false);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['channel-qr', channelId],
    queryFn: () => channelsService.getQr(channelId),
    // Polling a cada 3s enquanto não conectar; para quando conecta.
    refetchInterval: connected ? false : 3000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (data?.connected && !firedRef.current) {
      firedRef.current = true;
      setConnected(true);
      onConnected?.();
    }
  }, [data?.connected, onConnected]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Conectar {channelName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="size-5" />
          </button>
        </div>

        {connected || data?.connected ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 className="size-14 text-emerald-500" />
            <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
              WhatsApp conectado!
            </p>
            <p className="text-sm text-zinc-500">
              O número já está pareado e pronto para uso no CRM.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Concluir
            </button>
          </div>
        ) : data && data.supported === false ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            Este canal não usa pareamento por QR.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <ol className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
              <li className="flex gap-2">
                <span className="font-semibold text-indigo-600">1.</span> Abra o
                WhatsApp no celular do número comercial.
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-indigo-600">2.</span>{' '}
                <span className="inline-flex items-center gap-1">
                  <Smartphone className="size-4" /> Configurações → Dispositivos
                  conectados → Conectar um dispositivo.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-indigo-600">3.</span> Aponte a
                câmera para o QR ao lado.
              </li>
            </ol>

            <div className="flex size-56 items-center justify-center rounded-xl border border-zinc-200 bg-white p-2 dark:border-zinc-700">
              {isLoading ? (
                <Loader2 className="size-8 animate-spin text-zinc-400" />
              ) : data?.qrcode ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.qrcode} alt="QR de pareamento" className="size-full object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-center text-xs text-zinc-500">
                  {isError ? 'Falha ao obter o QR.' : 'QR indisponível no momento.'}
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
                  >
                    <RefreshCw className={`size-3 ${isFetching ? 'animate-spin' : ''}`} />
                    Gerar novo QR
                  </button>
                </div>
              )}
            </div>

            <p className="text-xs text-zinc-400 sm:col-span-2">
              {isFetching ? 'Verificando conexão…' : 'Aguardando leitura do QR…'}{' '}
              O QR é atualizado automaticamente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
