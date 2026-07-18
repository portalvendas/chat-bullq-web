'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { channelsService } from '../services/channels.service';

/**
 * Botão de conexão "Coexistence" do WhatsApp via Embedded Signup (QR).
 *
 * Fluxo: carrega o FB JS SDK → FB.login com o config_id de coexistence e
 * featureType=whatsapp_business_app_onboarding → a Meta mostra o QR no popup;
 * o lojista escaneia no app WhatsApp Business → a Meta devolve o `code`
 * (authResponse) e dispara um postMessage com o `waba_id`. Juntamos os dois e
 * mandamos pro backend (/integrations/whatsapp/embedded-signup), que conclui.
 *
 * Config via env (NEXT_PUBLIC_): META_APP_ID, META_ES_CONFIG_ID e (opcional)
 * META_GRAPH_VERSION. Sem eles, o botão avisa que falta configurar.
 */

const FB_SDK_ID = 'facebook-jssdk';
const APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
const CONFIG_ID = process.env.NEXT_PUBLIC_META_ES_CONFIG_ID;
const GRAPH_VERSION = process.env.NEXT_PUBLIC_META_GRAPH_VERSION || 'v21.0';

// Origens válidas do postMessage do Embedded Signup.
const FB_ORIGINS = new Set([
  'https://www.facebook.com',
  'https://web.facebook.com',
  'https://business.facebook.com',
]);

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

export function WhatsAppCoexistenceButton({
  onConnected,
}: {
  onConnected?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const wabaIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!APP_ID) return;

    // Captura o waba_id enviado pelo Embedded Signup via postMessage.
    const onMessage = (e: MessageEvent) => {
      if (!FB_ORIGINS.has(e.origin)) return;
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data?.type === 'WA_EMBEDDED_SIGNUP' && data?.data?.waba_id) {
          wabaIdRef.current = String(data.data.waba_id);
        }
      } catch {
        /* mensagens não-JSON do FB — ignorar */
      }
    };
    window.addEventListener('message', onMessage);

    // Carrega o SDK uma única vez.
    if (window.FB) {
      setSdkReady(true);
    } else if (!document.getElementById(FB_SDK_ID)) {
      window.fbAsyncInit = function () {
        window.FB.init({
          appId: APP_ID,
          autoLogAppEvents: true,
          xfbml: true,
          version: GRAPH_VERSION,
        });
        setSdkReady(true);
      };
      const js = document.createElement('script');
      js.id = FB_SDK_ID;
      js.src = 'https://connect.facebook.net/en_US/sdk.js';
      js.async = true;
      js.defer = true;
      document.body.appendChild(js);
    }

    return () => window.removeEventListener('message', onMessage);
  }, []);

  const connect = () => {
    if (!APP_ID || !CONFIG_ID) {
      toast.error(
        'Coexistence não configurado: defina NEXT_PUBLIC_META_APP_ID e NEXT_PUBLIC_META_ES_CONFIG_ID.',
      );
      return;
    }
    if (!window.FB) {
      toast.error('SDK do Facebook ainda carregando, tente de novo em instantes.');
      return;
    }

    setLoading(true);
    wabaIdRef.current = undefined;

    window.FB.login(
      (response: any) => {
        const code = response?.authResponse?.code;
        const wabaId = wabaIdRef.current;

        if (!code) {
          setLoading(false);
          toast.error('Conexão cancelada ou não autorizada.');
          return;
        }
        if (!wabaId) {
          setLoading(false);
          toast.error(
            'Não recebi o identificador da conta (waba_id) da Meta. Tente de novo.',
          );
          return;
        }

        channelsService
          .completeWhatsAppEmbeddedSignup({ code, wabaId })
          .then(() => {
            toast.success(
              'WhatsApp conectado! Sincronizando conversas e contatos…',
            );
            onConnected?.();
          })
          .catch((err: any) =>
            toast.error(
              err?.response?.data?.message || 'Falha ao concluir a conexão.',
            ),
          )
          .finally(() => setLoading(false));
      },
      {
        config_id: CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: 'whatsapp_business_app_onboarding',
          sessionInfoVersion: '3',
        },
      },
    );
  };

  const disabled = loading || !APP_ID || !CONFIG_ID;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={connect}
        disabled={disabled}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <QrCode className="size-4" />
        )}
        Conectar via QR (app WhatsApp Business)
      </button>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Escaneie o QR que a Meta exibe com o app WhatsApp Business. O número
        continua funcionando no app e passa a operar também aqui (coexistence).
      </p>
      {!APP_ID || !CONFIG_ID ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Configure <code>NEXT_PUBLIC_META_APP_ID</code> e{' '}
          <code>NEXT_PUBLIC_META_ES_CONFIG_ID</code> pra habilitar.
        </p>
      ) : (
        !sdkReady && (
          <p className="text-xs text-zinc-400">Carregando SDK da Meta…</p>
        )
      )}
    </div>
  );
}
