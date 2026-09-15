import { api } from '@/lib/api';

export type QuickReplyScope = 'ORG' | 'PERSONAL';
export type QuickReplyMediaType = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';

export interface QuickReplyAttachment {
  url: string;
  type: QuickReplyMediaType;
  mimeType?: string;
  fileName?: string;
  size?: number;
}

export interface QuickReply {
  id: string;
  organizationId: string;
  /** null = compartilhada (empresa); setado = pessoal do usuário. */
  userId: string | null;
  shortcut: string;
  title: string;
  content: string;
  /** TIPO/categoria livre p/ agrupar. null/'' = sem tipo. */
  category: string | null;
  attachments: QuickReplyAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface QuickReplyInput {
  shortcut: string;
  title: string;
  content: string;
  category?: string | null;
  attachments?: QuickReplyAttachment[];
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
  /**
   * Sobe um anexo (áudio vai pro endpoint de áudio; imagem/vídeo/doc pro de
   * mídia) e devolve o metadado pronto pra guardar na resposta rápida.
   */
  async uploadAttachment(file: File): Promise<QuickReplyAttachment> {
    const isAudio = (file.type || '').startsWith('audio/');
    const form = new FormData();
    form.append('file', file, file.name);
    const { data } = await api.post(
      isAudio ? '/messages/uploads/audio' : '/messages/uploads/media',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 },
    );
    const up = (data?.data ?? data) as {
      url: string;
      mimeType?: string;
      size?: number;
      filename?: string;
    };
    const mime = up.mimeType || file.type || '';
    const type: QuickReplyMediaType = mime.startsWith('image/')
      ? 'IMAGE'
      : mime.startsWith('video/')
        ? 'VIDEO'
        : mime.startsWith('audio/')
          ? 'AUDIO'
          : 'DOCUMENT';
    return {
      url: up.url,
      type,
      mimeType: mime,
      fileName: up.filename || file.name,
      size: up.size,
    };
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
