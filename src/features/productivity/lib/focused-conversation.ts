/**
 * Conversa aberta na tela agora (inbox ou modal de conversa). Lida pelo
 * rastreador de atividade a cada heartbeat — módulo simples, sem re-render.
 */
let focused: string | null = null;

export function setFocusedConversation(id: string | null): void {
  focused = id;
}

export function getFocusedConversation(): string | null {
  return focused;
}
