import { api } from '@/lib/api';

export type QuickReplyScope = 'ORG' | 'PERSONAL';

export interface QuickReply {
  id: string;
  organizationId: string;
  /** null = compartilhada (empresa); setado = pessoal do usuário. */
  userId: string | null;
  shortcut: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuickReplyInput {
  shortcut: string;
  title: string;
  content: string;
  scope?: QuickReplyScope;
}

function unwrap<T>(data: unknown): T {
  return ((data as { data?: T })?.data ?? data) as T;
}

export const quickRepliesService = {
  async list(): Promise<QuickReply[]> {
    const { data } = await api.get('/quick-replies');
    return unwrap<QuickReply[]>(data) ?? [];
  },
  async create(dto: QuickReplyInput): Promise<QuickReply> {
    const { data } = await api.post('/quick-replies', dto);
    return unwrap<QuickReply>(data);
  },
  async update(id: string, dto: Partial<QuickReplyInput>): Promise<QuickReply> {
    const { data } = await api.patch(`/quick-replies/${id}`, dto);
    return unwrap<QuickReply>(data);
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/quick-replies/${id}`);
  },
};

/**
 * Substitui {{cliente}} / {{vendedor}} (e sinônimos) pelo primeiro nome do
 * contato e do atendente. Espelha o renderVars dos salesbots — usado na hora
 * de inserir a resposta no campo, pra o atendente já ver o texto final.
 */
export function renderQuickReplyVars(
  text: string,
  ctx: { contactName?: string | null; agentName?: string | null },
): string {
  if (!text || !text.includes('{{')) return text;
  const first = (full?: string | null) => {
    const n = String(full ?? '').trim();
    if (!n) return '';
    const f = n.split(/\s+/)[0];
    return f.charAt(0).toUpperCase() + f.slice(1);
  };
  const cliente = first(ctx.contactName);
  const vendedor = first(ctx.agentName);
  const map: Record<string, string> = {
    cliente,
    contato: cliente,
    nome: cliente,
    lead: cliente,
    vendedor,
    vendedora: vendedor,
    atendente: vendedor,
    consultor: vendedor,
    consultora: vendedor,
  };
  return text
    .replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (m, key) => {
      const k = String(key).toLowerCase();
      return k in map ? map[k] : m;
    })
    .replace(/[ \t]{2,}/g, ' ');
}
