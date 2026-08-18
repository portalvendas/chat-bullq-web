'use client';

import { useEffect, useState } from 'react';
import type { ImpersonateResult } from '../services/platform-admin.service';

/**
 * Impersonação = super-admin "agir como" um membro de outra empresa por 30min.
 * O backend emite um JWT curto com claim imp={by,org}. No cliente guardamos o
 * token/org do ADMIN pra restaurar depois, trocamos o access_token/active_org_id
 * pelo da impersonação e navegamos pro inbox. Ao sair (ou expirar), restauramos.
 *
 * O refresh_token permanece o do admin, então NÃO refrescamos durante a
 * impersonação (o interceptor do axios encerra a impersonação no 401 em vez de
 * refrescar — ver src/lib/api.ts).
 */

const IMP_KEYS = [
  'imp_active',
  'imp_admin_token',
  'imp_admin_org',
  'imp_label',
  'imp_expires_at',
] as const;

export interface ImpersonationState {
  active: boolean;
  label: string | null;
  expiresAt: number | null;
}

function read(): ImpersonationState {
  if (typeof window === 'undefined') {
    return { active: false, label: null, expiresAt: null };
  }
  const active = localStorage.getItem('imp_active') === '1';
  const label = localStorage.getItem('imp_label');
  const exp = localStorage.getItem('imp_expires_at');
  return { active, label, expiresAt: exp ? Number(exp) : null };
}

function parseExpiresIn(v: string): number {
  const m = /^(\d+)\s*([smhd])?$/.exec((v || '').trim());
  if (!m) return 30 * 60 * 1000;
  const n = Number(m[1]);
  const unit = m[2] || 's';
  const mult =
    unit === 'd' ? 86400000 : unit === 'h' ? 3600000 : unit === 'm' ? 60000 : 1000;
  return n * mult;
}

export function enterImpersonation(result: ImpersonateResult): void {
  if (typeof window === 'undefined') return;
  const adminToken = localStorage.getItem('access_token');
  const adminOrg = localStorage.getItem('active_org_id');
  if (adminToken) localStorage.setItem('imp_admin_token', adminToken);
  if (adminOrg) localStorage.setItem('imp_admin_org', adminOrg);

  localStorage.setItem('imp_active', '1');
  localStorage.setItem(
    'imp_label',
    `${result.actingAs.name} · ${result.organization.name}`,
  );
  localStorage.setItem(
    'imp_expires_at',
    String(Date.now() + parseExpiresIn(result.expiresIn)),
  );

  localStorage.setItem('access_token', result.token);
  localStorage.setItem('active_org_id', result.organization.id);

  window.location.href = '/inbox';
}

export function exitImpersonation(redirectTo = '/super-admin'): void {
  if (typeof window === 'undefined') return;
  const adminToken = localStorage.getItem('imp_admin_token');
  const adminOrg = localStorage.getItem('imp_admin_org');
  IMP_KEYS.forEach((k) => localStorage.removeItem(k));
  if (adminToken) localStorage.setItem('access_token', adminToken);
  else localStorage.removeItem('access_token');
  if (adminOrg) localStorage.setItem('active_org_id', adminOrg);
  else localStorage.removeItem('active_org_id');
  window.location.href = redirectTo;
}

export function useImpersonation(): ImpersonationState {
  const [state, setState] = useState<ImpersonationState>(() => read());
  useEffect(() => {
    const update = () => setState(read());
    update();
    window.addEventListener('storage', update);
    const t = window.setInterval(update, 1000);
    return () => {
      window.removeEventListener('storage', update);
      window.clearInterval(t);
    };
  }, []);
  return state;
}
