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
export type CadenceTrigger = 'MANUAL' | 'TAG_ADDED';
export interface Cadence {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  triggerType: CadenceTrigger;
  triggerValue: string | null;
  stopOnReply: boolean;
  businessHoursOnly: boolean;
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
  steps?: WorkflowStep[];
  graph?: WorkflowGraph;
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
  async importKommo(
    files: Array<{ name: string; model: unknown }>,
  ): Promise<KommoImportResult> {
    const { data } = await api.post('/cadences/import-kommo', { files });
    return unwrap<KommoImportResult>(data);
  },
};

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
