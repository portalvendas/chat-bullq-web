'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { SuperAdminConsole } from '@/features/platform-admin/components/super-admin-console';

/**
 * Console de super-admin. Gate no cliente por isPlatformAdmin (o backend
 * também protege cada rota com PlatformAdminGuard — este gate é só de UX).
 */
export default function SuperAdminPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user && !user.isPlatformAdmin) {
      router.replace('/inbox');
    }
  }, [user, router]);

  if (!user || !user.isPlatformAdmin) return null;
  return <SuperAdminConsole />;
}
