import { api } from '@/lib/api';

export type MessageCategory =
  | 'MARKETING'
  | 'UTILITY'
  | 'AUTHENTICATION'
  | 'SERVICE';

export interface AudienceFilter {
  pipelineId?: string;
  stageId?: string;
  tagIds?: string[];
  tagMatch?: 'ANY' | 'ALL';
  hasPedido?: boolean;
  hasOrcamento?: boolean;
  from?: string;
  to?: string;
  excludeOptedOut?: boolean;
}

export interface PreviewLead {
  id: string;
  name: string | null;
  phone: string | null;
  pedidos: number;
  orcamentos: number;
  valorPedidos: number;
}

export interface RateCardRow {
  category: MessageCategory;
  amountMicros: string;
  currency: string;
}

export interface BudgetUsage {
  capMicros: string;
  committedMicros: string;
  chargedMicros: string;
  availableMicros: string;
  period: 'MONTHLY' | 'TOTAL';
  hasCap: boolean;
}

export interface EstimateResult {
  recipients: number;
  unitMicros: string;
  estimatedTotalMicros: string;
  isCeiling: boolean;
  category: MessageCategory;
  budget: BudgetUsage & { withinBudget: boolean };
}

export interface ApprovedTemplate {
  id: string;
  name: string;
  language: string;
  category: MessageCategory;
  bodyText: string;
  components: any;
}

export interface Broadcast {
  id: string;
  name: string;
  channelId: string;
  templateName: string;
  templateLanguage: string;
  templateCategory: MessageCategory;
  status: string;
  audienceFilter: AudienceFilter;
  variablesMapping?: Record<string, any> | null;
  scheduledAt?: string | null;
  estimatedRecipients: number;
  estimatedCostMicros: string;
  actualCostMicros: string;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  recipientCounts?: Record<string, number>;
}

export interface BroadcastRecipient {
  id: string;
  status: string;
  phoneE164: string;
  wamid: string | null;
  errorMessage: string | null;
  billedAmountMicros: string | null;
  contact: { id: string; name: string | null; phone: string | null };
}

const unwrap = <T>(data: any): T => (data?.data ?? data) as T;

/** micros (string) → número em reais. */
export function microsToBRL(micros: string | null | undefined): number {
  if (!micros) return 0;
  return Number(micros) / 1_000_000;
}
export function fmtBRL(micros: string | null | undefined): string {
  return microsToBRL(micros).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export const disparosService = {
  async rateCard(): Promise<RateCardRow[]> {
    const { data } = await api.get('/broadcast/pricing');
    return unwrap<RateCardRow[]>(data) ?? [];
  },
  async budget(): Promise<BudgetUsage> {
    const { data } = await api.get('/broadcast/budget');
    return unwrap<BudgetUsage>(data);
  },
  async setBudget(capMicros: string, period: 'MONTHLY' | 'TOTAL' = 'MONTHLY') {
    const { data } = await api.put('/broadcast/budget', { capMicros, period });
    return unwrap<BudgetUsage>(data);
  },
  async templates(channelId?: string): Promise<ApprovedTemplate[]> {
    const { data } = await api.get('/broadcast/templates', {
      params: channelId ? { channelId } : {},
    });
    return unwrap<ApprovedTemplate[]>(data) ?? [];
  },
  async estimate(payload: {
    audienceFilter: AudienceFilter;
    templateCategory: MessageCategory;
  }): Promise<EstimateResult> {
    const { data } = await api.post('/broadcast/estimate', payload);
    return unwrap<EstimateResult>(data);
  },
  async previewAudience(
    audienceFilter: AudienceFilter,
    cursor?: string,
  ): Promise<{ items: PreviewLead[]; nextCursor: string | null }> {
    const { data } = await api.post('/broadcast/audience/preview', {
      audienceFilter,
      cursor,
    });
    return unwrap(data);
  },
  async list(cursor?: string): Promise<{ items: Broadcast[]; nextCursor: string | null }> {
    const { data } = await api.get('/broadcasts', { params: { cursor } });
    return unwrap(data);
  },
  async get(id: string): Promise<Broadcast> {
    const { data } = await api.get(`/broadcasts/${id}`);
    return unwrap<Broadcast>(data);
  },
  async recipients(
    id: string,
    status?: string,
    cursor?: string,
  ): Promise<{ items: BroadcastRecipient[]; nextCursor: string | null }> {
    const { data } = await api.get(`/broadcasts/${id}/recipients`, {
      params: { status, cursor },
    });
    return unwrap(data);
  },
  async create(payload: {
    channelId: string;
    name: string;
    templateName: string;
    templateLanguage: string;
    templateCategory: MessageCategory;
    variablesMapping?: Record<string, any>;
    audienceFilter: AudienceFilter;
    scheduledAt?: string;
    throttlePerMinute?: number;
  }): Promise<Broadcast> {
    const { data } = await api.post('/broadcasts', payload);
    return unwrap<Broadcast>(data);
  },
  async action(id: string, act: 'start' | 'pause' | 'resume' | 'cancel'): Promise<Broadcast> {
    const { data } = await api.post(`/broadcasts/${id}/${act}`);
    return unwrap<Broadcast>(data);
  },
  async importContacts(payload: {
    fileName?: string;
    rows: Array<{ name?: string; phone?: string; email?: string }>;
    tagIds?: string[];
  }): Promise<{ id: string; status: string }> {
    const { data } = await api.post('/contacts/import', payload);
    return unwrap(data);
  },
  async importStatus(id: string) {
    const { data } = await api.get(`/contacts/imports/${id}`);
    return unwrap<any>(data);
  },
};
