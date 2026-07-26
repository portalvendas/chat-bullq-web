'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * As cadências viraram "Salesbots" e vivem agora dentro do Jarvis
 * (/ai-agents?tab=salesbots). Mantemos esta rota só como redirect para não
 * quebrar links/bookmarks antigos.
 */
export default function CadencesRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/ai-agents?tab=salesbots');
  }, [router]);
  return null;
}
