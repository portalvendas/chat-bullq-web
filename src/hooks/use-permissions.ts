'use client';

import { useQuery } from '@tanstack/react-query';
import {
  permissionGroupsService,
  type EffectivePermissions,
} from '@/features/settings/services/permission-groups.service';

/**
 * Permissões efetivas do usuário logado. Owner/Admin = acesso total.
 * Enquanto carrega (ou sem dados), assume PERMISSIVO para não esconder telas
 * indevidamente por um flicker.
 */
export function usePermissions() {
  const { data, isLoading } = useQuery<EffectivePermissions | null>({
    queryKey: ['permissions', 'me'],
    queryFn: () => permissionGroupsService.myEffective(),
    staleTime: 5 * 60_000,
  });

  const perms = data ?? null;
  const permissive = isLoading || !perms || perms.fullAccess;

  const canView = (mod: string) => permissive || !!perms?.modules?.[mod]?.view;
  const canEdit = (mod: string) => permissive || !!perms?.modules?.[mod]?.edit;
  const canDelete = (mod: string) => permissive || !!perms?.modules?.[mod]?.delete;

  return { perms, isLoading, permissive, canView, canEdit, canDelete };
}
