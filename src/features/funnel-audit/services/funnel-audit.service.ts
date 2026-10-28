import { api } from '@/lib/api';

function unwrap<T>(data: any): T {
  return (data?.data ?? data) as T;
}

export interface AuditRun {
  id: string;
  status: 'RUNNING' | 'DONE' | 'FAILED';
  windowDays: number;
  cardsScanned: number;
  cardsFlagged: number;
  suggestions: number;
  findings?: number;
  aiUsed: boolean;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface AuditSuggestion {
  id: string;
  cardId: string;
  pipelineId: string;
  pipelineName: string | null;
  currentStageId: string;
  currentStageName: string | null;
  suggestedStageId: string | null;
  suggestedStageName: string | null;
  action: 'ADVANCE' | 'REGRESS' | 'WON' | 'LOST' | 'KEEP' | string;
  reason: string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  source: 'ai' | 'rule' | string;
  status: 'PENDING' | 'APPLIED' | 'DISMISSED';
  lead: {
    title: string | null;
    name: string | null;
    phone: string | null;
    value: number | null;
    conversationId: string | null;
  };
}

export interface AuditSuggestionsPage {
  runId: string | null;
  items: AuditSuggestion[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

/** Achado das checagens do processo comercial (SQL, sem IA). */
export interface AuditFinding {
  id: string;
  type: string;
  label: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  minutes: number | null;
  details: Record<string, any> | null;
  cardId: string | null;
  pipelineId: string | null;
  pipeline: string | null;
  stage: string | null;
  conversationId: string | null;
  lead: { name: string | null; phone: string | null };
  owner: { id: string; name: string | null } | null;
}

export interface AuditFindingsPage {
  runId: string | null;
  finishedAt: string | null;
  scheduled?: boolean;
  summary: {
    byType: { type: string; label: string; count: number; high: number }[];
    bySeller: { userId: string | null; name: string; count: number }[];
  };
  items: AuditFinding[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const funnelAuditService = {
  async findings(params: {
    runId?: string;
    type?: string;
    ownerUserId?: string;
    page?: number;
    limit?: number;
  }): Promise<AuditFindingsPage> {
    const { data } = await api.get('/funnel-audit/findings', { params });
    return unwrap<AuditFindingsPage>(data);
  },
  async run(
    pipelineIds?: string[],
  ): Promise<{ runId: string; alreadyRunning: boolean }> {
    const { data } = await api.post('/funnel-audit/run', {
      pipelineIds: pipelineIds?.length ? pipelineIds : undefined,
    });
    return unwrap(data);
  },
  async latest(): Promise<AuditRun | null> {
    const { data } = await api.get('/funnel-audit/latest');
    return unwrap<AuditRun | null>(data);
  },
  async suggestions(params: {
    runId?: string;
    status?: string;
    pipelineId?: string;
    page?: number;
    limit?: number;
  }): Promise<AuditSuggestionsPage> {
    const { data } = await api.get('/funnel-audit/suggestions', { params });
    return unwrap<AuditSuggestionsPage>(data);
  },
  async apply(id: string): Promise<void> {
    await api.post(`/funnel-audit/suggestions/${id}/apply`, {});
  },
  async dismiss(id: string): Promise<void> {
    await api.post(`/funnel-audit/suggestions/${id}/dismiss`, {});
  },
};
