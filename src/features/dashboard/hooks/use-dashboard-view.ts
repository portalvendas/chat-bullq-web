'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Decide qual Dashboard renderizar: 'mobile' (celular) ou 'desktop'.
 *
 * Regra: celular = viewport < 768px. O usuário pode forçar uma versão
 * (botão "Versão completa" / "Versão mobile") — a escolha fica salva na
 * sessão do navegador. `?view=mobile|desktop` na URL também força (útil pra
 * testar no desktop).
 *
 * Retorna `null` até medir a tela (1º render no cliente) — assim nenhuma
 * das duas versões dispara as queries antes da hora.
 */
export type DashboardView = 'mobile' | 'desktop';

const STORAGE_KEY = 'dashboard.view';
const MOBILE_QUERY = '(max-width: 767px)';

export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(MOBILE_QUERY).matches;
}

export function useDashboardView(urlOverride?: string | null) {
  const [auto, setAuto] = useState<DashboardView | null>(null);
  const [forced, setForced] = useState<DashboardView | null>(null);

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(STORAGE_KEY);
      if (saved === 'mobile' || saved === 'desktop') setForced(saved);
    } catch {
      /* storage indisponível (modo privado) → segue no automático */
    }
    const mq = window.matchMedia(MOBILE_QUERY);
    const apply = () => setAuto(mq.matches ? 'mobile' : 'desktop');
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const setView = useCallback((v: DashboardView | null) => {
    setForced(v);
    try {
      if (v) window.sessionStorage.setItem(STORAGE_KEY, v);
      else window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const fromUrl = urlOverride === 'mobile' || urlOverride === 'desktop' ? urlOverride : null;
  const view: DashboardView | null = auto === null ? null : fromUrl ?? forced ?? auto;
  return { view, isMobileDevice: auto === 'mobile', setView };
}
