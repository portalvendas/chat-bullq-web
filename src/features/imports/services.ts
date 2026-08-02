import { api } from '@/lib/api';

export type CustomFieldEntity = 'CONTACT' | 'CARD';
export type CustomFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN';

export interface CustomField {
  id: string;
  organizationId: string;
  entity: CustomFieldEntity;
  key: string;
  label: string;
  type: CustomFieldType;
  order: number;
  createdAt: string;
}

export interface CustomFieldInput {
  label: string;
  entity?: CustomFieldEntity;
  type?: CustomFieldType;
  key?: string;
}

export const customFieldsService = {
  async list(entity?: CustomFieldEntity): Promise<CustomField[]> {
    const { data } = await api.get('/custom-fields', {
      params: entity ? { entity } : {},
    });
    return data.data ?? data;
  },
  async create(input: CustomFieldInput): Promise<CustomField> {
    const { data } = await api.post('/custom-fields', input);
    return data.data ?? data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/custom-fields/${id}`);
  },
};

// ─── Import ───────────────────────────────────────────────────────

export interface ImportLeadRow {
  externalId?: string | null;
  title?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  stageName?: string | null;
  status?: string | null;
  value?: number | string | null;
  closedReason?: string | null;
  tags?: string[];
  createdAt?: string | null;
  tracking?: Record<string, any> | null;
  custom?: Record<string, any> | null;
}

export interface ImportLeadsPayload {
  pipelineId: string;
  createMissingStages?: boolean;
  customFields?: CustomFieldInput[];
  rows: ImportLeadRow[];
}

export interface ImportSummary {
  contactsCreated: number;
  contactsUpdated: number;
  cardsCreated: number;
  cardsSkipped: number;
  stagesCreated: number;
  errors: Array<{ row: number; error: string }>;
}

export const importsService = {
  async importLeads(payload: ImportLeadsPayload): Promise<ImportSummary> {
    const { data } = await api.post('/imports/leads', payload);
    return data.data ?? data;
  },
};
