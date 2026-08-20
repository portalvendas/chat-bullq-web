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

export const funnelAuditService = {
  async run(): Promise<{ runId: string; alreadyRunning: boolean }> {
    const { data } = await api.post('/funnel-audit/run', {});
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
