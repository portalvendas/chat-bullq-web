'use client';

import { useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import {
  useImpersonation,
  exitImpersonation,
} from '../hooks/use-impersonation';

/** Barra global fixa enquanto o super-admin está agindo como outro usuário. */
export function ImpersonationBanner() {
  const { active, label, expiresAt } = useImpersonation();

  useEffect(() => {
    if (active && expiresAt && Date.now() >= expiresAt) {
      exitImpersonation();
    }
  }, [active, expiresAt]);

  if (!active) return null;

  const remaining =
    expiresAt != null ? Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)) : null;
  const mm =
    remaining != null ? String(Math.floor(remaining / 60)).padStart(2, '0') : '--';
  const ss = remaining != null ? String(remaining % 60).padStart(2, '0') : '--';

  return (
    <div className="flex items-center gap-3 border-b border-amber-600/30 bg-amber-500 px-4 py-2 text-sm text-amber-950">
      <ShieldAlert className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">
        Agindo como <strong>{label}</strong> · impersonação expira em {mm}:{ss}
      </span>
      <button
        type="button"
        onClick={() => exitImpersonation()}
        className="shrink-0 rounded-md bg-amber-950/10 px-3 py-1 font-medium transition hover:bg-amber-950/20"
      >
        Sair da impersonação
      </button>
    </div>
  );
}
