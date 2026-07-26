import { api } from '@/lib/api';

export interface CadenceStep {
  delayMinutes: number;
  text: string;
}
export interface CadenceOnEnd {
  tagName?: string;
  moveStageId?: string;
  close?: boolean;
}
export interface Cadence {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  stopOnReply: boolean;
  businessHoursOnly: boolean;
  steps: CadenceStep[];
  onEnd: CadenceOnEnd;
  _count?: { runs: number };
}
export interface CadenceInput {
  name: string;
  description?: string | null;
  active?: boolean;
  stopOnReply?: boolean;
  businessHoursOnly?: boolean;
  steps?: CadenceStep[];
  onEnd?: CadenceOnEnd;
}

function unwrap<T>(data: any): T {
  return (data?.data ?? data) as T;
}

export const cadencesService = {
  async list(): Promise<Cadence[]> {
    const { data } = await api.get('/cadences');
    return unwrap<Cadence[]>(data) ?? [];
  },
  async create(dto: CadenceInput): Promise<Cadence> {
    const { data } = await api.post('/cadences', dto);
    return unwrap<Cadence>(data);
  },
  async update(id: string, dto: CadenceInput): Promise<Cadence> {
    const { data } = await api.patch(`/cadences/${id}`, dto);
    return unwrap<Cadence>(data);
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/cadences/${id}`);
  },
  async start(id: string, conversationId: string): Promise<{ started: boolean; reason?: string }> {
    const { data } = await api.post(`/cadences/${id}/start`, { conversationId });
    return unwrap(data);
  },
};
