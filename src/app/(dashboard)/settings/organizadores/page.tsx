import { redirect } from 'next/navigation';

/**
 * Aba Organizadores APOSENTADA — o diretório largura→anúncio foi absorvido pela
 * Central de Conhecimento (Configurações → Conhecimento: import de links +
 * varredura de anúncios). Mantemos a rota só pra redirecionar quem tiver o link
 * antigo salvo.
 */
export default function OrganizadoresRedirect() {
  redirect('/settings/knowledge');
}
