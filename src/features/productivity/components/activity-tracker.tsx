'use client';

/**
 * Rastreador de atividade do vendedor (tempo de tela DENTRO do CRM).
 *
 * A cada 30s manda um heartbeat com o estado da aba:
 *  - active:     aba visível e com interação (mouse/teclado/scroll/toque) nos
 *                últimos 3 min;
 *  - idle:       aba visível, sem interação há mais de 3 min;
 *  - background: aba aberta, mas escondida (outra aba/app na frente).
 * Junto vai a área do CRM (1º segmento da URL) e a conversa aberta, se houver.
 *
 * Não lê nada fora do CRM (outros sites/apps) e não guarda conteúdo — só
 * estado + área + id da conversa. O servidor agrega por minuto.
 * Durante impersonação (super-admin "entrando como" alguém) NÃO envia nada.
 */
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { productivityService, type ActivityState } from '../services/productivity.service';
import { getFocusedConversation } from '../lib/focused-conversation';

const BEAT_MS = 30_000;
const IDLE_AFTER_MS = 3 * 60_000;
const INPUT_EVENTS = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;

function currentArea(pathname: string | null): string {
  const seg = (pathname ?? '').split('/').filter(Boolean)[0] ?? 'inicio';
  return seg.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
}

export function ActivityTracker() {
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    let lastInput = Date.now();
    let inFlight = false;

    const onInput = () => {
      lastInput = Date.now();
    };

    const state = (): ActivityState => {
      if (document.visibilityState !== 'visible') return 'background';
      return Date.now() - lastInput < IDLE_AFTER_MS ? 'active' : 'idle';
    };

    const beat = async () => {
      if (inFlight) return;
      try {
        if (!localStorage.getItem('access_token')) return;
        if (localStorage.getItem('imp_active')) return; // impersonação: não mede
      } catch {
        return;
      }
      inFlight = true;
      const area = currentArea(pathRef.current);
      const conversationId = getFocusedConversation() ?? undefined;
      try {
        await productivityService.heartbeat({ state: state(), area, conversationId });
      } catch {
        // Telemetria nunca atrapalha o uso: falhou, tenta no próximo ciclo.
      } finally {
        inFlight = false;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') lastInput = Date.now();
      void beat();
    };

    INPUT_EVENTS.forEach((e) => window.addEventListener(e, onInput, { passive: true, capture: true }));
    document.addEventListener('visibilitychange', onVisibility);
    void beat();
    const timer = window.setInterval(() => void beat(), BEAT_MS);

    return () => {
      window.clearInterval(timer);
      INPUT_EVENTS.forEach((e) => window.removeEventListener(e, onInput, { capture: true }));
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return null;
}
