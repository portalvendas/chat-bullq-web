import { api } from '@/lib/api';

// Workflow tipado — cada passo é de um tipo. A ordem do array é a ordem de
// execução (igual ao Salesbot do Kommo). O backend normaliza o formato
// legado ({delayMinutes,text}) automaticamente, mas o front já cria tipado.
export type WorkflowStep =
  | { type: 'message'; text: string }
  | { type: 'wait'; delayMinutes: number }
  | { type: 'action'; action: 'tag' | 'move_stage' | 'close'; value?: string };

export type StepType = WorkflowStep['type'];

// ─── Grafo do salesbot (motor com ramificações) ───
export type GraphNodeType = 'start' | 'message' | 'wait' | 'action' | 'stop';
export type NodeHandle = 'out' | 'timeout' | 'reply';
export type ActionKind = 'tag' | 'move_stage' | 'close';

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  text?: string;
  templateId?: string;
  mediaUrl?: string;
  mediaType?: 'DOCUMENT' | 'IMAGE';
  fileName?: string;
  delayMinutes?: number;
  untilReply?: boolean;
  businessHoursOnly?: boolean;
  action?: ActionKind;
  value?: string;
  x?: number;
  y?: number;
}
export interface GraphEdge {
  id?: string;
  from: string;
  fromHandle?: NodeHandle;
  to: string;
}
export interface WorkflowGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** @deprecated formato legado — mantido só para leitura de dados antigos. */
export interface CadenceStep {
  delayMinutes: number;
  text: string;
}
export interface CadenceOnEnd {
  tagName?: string;
  moveStageId?: string;
  close?: boolean;
}
export type CadenceTrigger =
  | 'MANUAL'
  | 'TAG_ADDED'
  | 'STAGE_ENTERED'
  | 'INACTIVITY';
export interface Cadence {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  triggerType: CadenceTrigger;
  triggerValue: string | null;
  stopOnReply: boolean;
  businessHoursOnly: boolean;
  /** Origens permitidas (channelIds). Vazio = todas. */
  channelFilter: string[];
  steps: WorkflowStep[];
  graph?: WorkflowGraph;
  onEnd: CadenceOnEnd;
  _count?: { runs: number };
}
export interface CadenceInput {
  name: string;
  description?: string | null;
  active?: boolean;
  triggerType?: CadenceTrigger;
  triggerValue?: string | null;
  stopOnReply?: boolean;
  businessHoursOnly?: boolean;
  channelFilter?: string[];
  steps?: WorkflowStep[];
  graph?: WorkflowGraph;
  onEnd?: CadenceOnEnd;
}

export interface ActiveSalesbot {
  runId: string;
  status: 'RUNNING' | 'WAITING';
  cadenceId: string;
  name: string;
  startedAt: string;
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
  async activeForConversation(conversationId: string): Promise<ActiveSalesbot[]> {
    const { data } = await api.get(`/cadences/active/${conversationId}`);
    return unwrap<ActiveSalesbot[]>(data) ?? [];
  },
  async importKommo(
    files: Array<{ name: string; model: unknown }>,
  ): Promise<KommoImportResult> {
    const { data } = await api.post('/cadences/import-kommo', { files });
    return unwrap<KommoImportResult>(data);
  },
  async autoLinkTemplates(
    id: string,
    execute: boolean,
  ): Promise<AutoLinkResult> {
    const { data } = await api.post(
      `/cadences/${id}/auto-link-templates`,
      {},
      { params: { execute: execute ? 'true' : 'false' } },
    );
    return unwrap<AutoLinkResult>(data);
  },
};

export interface AutoLinkResult {
  total: number;
  linked: number;
  execute: boolean;
  results: Array<{
    nodeId: string;
    text: string;
    template: string | null;
    score: number;
  }>;
}

export interface KommoImportResult {
  created: number;
  skipped: number;
  results: Array<{
    name: string;
    status: 'created' | 'skipped' | 'error';
    nodes?: number;
    warnings?: string[];
    error?: string;
  }>;
}
