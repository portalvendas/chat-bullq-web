import { api } from '@/lib/api';

export type KnowledgeStatus = 'DRAFT' | 'PENDING' | 'VALIDATED' | 'ARCHIVED';
export type KnowledgeType =
  | 'FACT'
  | 'FAQ'
  | 'POLICY'
  | 'VARIANT_MAP'
  | 'AD_SPEC'
  | 'LINK';
export type KnowledgeSource =
  | 'MANUAL'
  | 'OPERATOR_COMPLEMENT'
  | 'AD_SCAN'
  | 'FILE_IMPORT';

export interface KnowledgeItem {
  id: string;
  type: KnowledgeType;
  status: KnowledgeStatus;
  source: KnowledgeSource;
  itemId: string | null;
  title: string | null;
  text: string;
  sourceQuestion: string | null;
  createdAt: string;
  validatedAt: string | null;
}

function unwrap<T>(data: any): T {
  return (data?.data ?? data) as T;
}

export const knowledgeService = {
  async list(params: {
    status?: KnowledgeStatus;
    type?: KnowledgeType;
    search?: string;
  } = {}): Promise<KnowledgeItem[]> {
    const { data } = await api.get('/knowledge', { params });
    return unwrap<KnowledgeItem[]>(data) ?? [];
  },

  async counts(): Promise<Record<string, number>> {
    const { data } = await api.get('/knowledge/counts');
    return unwrap<Record<string, number>>(data) ?? {};
  },

  async create(dto: {
    text: string;
    itemId?: string | null;
    title?: string | null;
    type?: KnowledgeType;
    status?: KnowledgeStatus;
  }): Promise<KnowledgeItem> {
    const { data } = await api.post('/knowledge', dto);
    return unwrap<KnowledgeItem>(data);
  },

  async validate(id: string): Promise<KnowledgeItem> {
    const { data } = await api.post(`/knowledge/${id}/validate`, {});
    return unwrap<KnowledgeItem>(data);
  },

  async reject(id: string): Promise<KnowledgeItem> {
    const { data } = await api.post(`/knowledge/${id}/reject`, {});
    return unwrap<KnowledgeItem>(data);
  },

  async update(
    id: string,
    dto: { text?: string; title?: string | null; itemId?: string | null },
  ): Promise<KnowledgeItem> {
    const { data } = await api.patch(`/knowledge/${id}`, dto);
    return unwrap<KnowledgeItem>(data);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/knowledge/${id}`);
  },
};
