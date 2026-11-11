import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

/** Celular (pelo User-Agent) entra no Dashboard mobile; desktop, no inbox. */
const MOBILE_UA = /Android|iPhone|iPod|Mobile|Opera Mini|IEMobile/i;

export default async function Home() {
  const ua = (await headers()).get('user-agent') ?? '';
  redirect(MOBILE_UA.test(ua) ? '/dashboard' : '/inbox');
}
