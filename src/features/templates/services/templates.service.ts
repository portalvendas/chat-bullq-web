import { api } from '@/lib/api';

export interface WhatsappTemplate {
  id: string;
  name: string;
  status: string; // APPROVED | PENDING | REJECTED | ...
  category: string; // MARKETING | UTILITY | AUTHENTICATION
  language: string; // pt_BR
  waba: string | null;
  bodyText: string;
  source: string; // SEED | META_SYNC | MANUAL
  channelId: string | null;
  externalId: string | null;
}

export interface TemplateListResult {
  items: WhatsappTemplate[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

function unwrap<T>(data: any): T {
  return (data?.data ?? data) as T;
}

export const templatesService = {
  async list(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
  } = {}): Promise<TemplateListResult> {
    const { data } = await api.get('/whatsapp-templates', { params });
    return unwrap<TemplateListResult>(data);
  },
  async seed(): Promise<{ seeded: number }> {
    const { data } = await api.post('/whatsapp-templates/seed', {});
    return unwrap(data);
  },
  async sync(): Promise<{
    synced: number;
    channels: number;
    errors: Array<{ channelId: string; error: string }>;
  }> {
    const { data } = await api.post('/whatsapp-templates/sync', {});
    return unwrap(data);
  },
  async create(dto: TemplateInput): Promise<WhatsappTemplate> {
    const { data } = await api.post('/whatsapp-templates', dto);
    return unwrap<WhatsappTemplate>(data);
  },
  async update(id: string, dto: Partial<TemplateInput>): Promise<WhatsappTemplate> {
    const { data } = await api.patch(`/whatsapp-templates/${id}`, dto);
    return unwrap<WhatsappTemplate>(data);
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/whatsapp-templates/${id}`);
  },
};

export interface TemplateInput {
  name: string;
  bodyText: string;
  waba?: string | null;
  status?: string;
  category?: string;
  language?: string;
}
