import { api } from '@/lib/api';

export interface LeadAdsPage {
  id: string;
  pageId: string;
  pageName: string | null;
  active: boolean;
  createdAt?: string;
  subscription?: { ok: boolean; error?: string };
}

function unwrap<T>(data: any): T {
  return (data?.data ?? data) as T;
}

export const leadAdsService = {
  async list(): Promise<LeadAdsPage[]> {
    const { data } = await api.get('/lead-ads/pages');
    return unwrap<LeadAdsPage[]>(data) ?? [];
  },
  async save(dto: {
    pageId: string;
    pageName?: string;
    accessToken: string;
  }): Promise<LeadAdsPage> {
    const { data } = await api.post('/lead-ads/pages', dto);
    return unwrap<LeadAdsPage>(data);
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/lead-ads/pages/${id}`);
  },
  /**
   * Importa (backfill) os leads já existentes de um formulário instantâneo.
   * Pode demorar (pagina a Graph API), então usa timeout estendido.
   */
  async importForm(dto: {
    formId: string;
    pageId?: string;
  }): Promise<{
    formId: string;
    pageId: string;
    total: number;
    created: number;
    skipped: number;
    errors: number;
  }> {
    const { data } = await api.post('/lead-ads/import', dto, {
      timeout: 120000,
    });
    return unwrap(data);
  },
};
