import type {
  Cadence,
  WorkflowGraph,
  GraphNode,
  GraphEdge,
  WorkflowStep,
} from '@/features/cadences/services/cadences.service';

/** Grafo novo, só com o nó de entrada. */
export function emptyGraph(): WorkflowGraph {
  return { nodes: [{ id: 'start', type: 'start', x: 60, y: 200 }], edges: [] };
}

function normSteps(raw: unknown): WorkflowStep[] {
  if (!Array.isArray(raw)) return [];
  const out: WorkflowStep[] = [];
  for (const s of raw) {
    if (!s || typeof s !== 'object') continue;
    const o = s as Record<string, any>;
    if (o.type === 'message' && typeof o.text === 'string') {
      out.push({ type: 'message', text: o.text });
    } else if (o.type === 'wait') {
      out.push({ type: 'wait', delayMinutes: Number(o.delayMinutes) || 0 });
    } else if (o.type === 'action') {
      out.push({ type: 'action', action: o.action, value: o.value });
    } else if (typeof o.text === 'string') {
      if (Number(o.delayMinutes) > 0)
        out.push({ type: 'wait', delayMinutes: Number(o.delayMinutes) });
      out.push({ type: 'message', text: o.text });
    }
  }
  return out;
}

/**
 * Deriva o grafo editável de um bot. Espelha o `resolveGraph` do backend:
 *  - se já há grafo salvo (com nós), usa;
 *  - senão converte a régua linear (`steps`) em start → passos → stop.
 */
export function graphFromCadence(cadence: Cadence): WorkflowGraph {
  const g = cadence.graph;
  if (g && Array.isArray(g.nodes) && g.nodes.length) return g;

  const steps = normSteps(cadence.steps);
  const nodes: GraphNode[] = [{ id: 'start', type: 'start', x: 60, y: 200 }];
  const edges: GraphEdge[] = [];
  let prev = 'start';
  let x = 320;
  steps.forEach((s, i) => {
    const id = `n${i}`;
    const node: GraphNode = { id, type: s.type, x, y: 200 };
    if (s.type === 'message') node.text = s.text;
    else if (s.type === 'wait') {
      node.delayMinutes = s.delayMinutes;
      node.untilReply = cadence.stopOnReply;
      node.businessHoursOnly = cadence.businessHoursOnly;
    } else if (s.type === 'action') {
      node.action = s.action;
      node.value = s.value;
    }
    nodes.push(node);
    edges.push({ from: prev, fromHandle: 'out', to: id });
    prev = id;
    x += 280;
  });
  nodes.push({ id: 'stop', type: 'stop', x, y: 200 });
  edges.push({ from: prev, fromHandle: 'out', to: 'stop' });
  return { nodes, edges };
}

/** Grafo de exemplo (Follow-up de orçamento com bifurcação por resposta). */
export function followupGraph(): WorkflowGraph {
  const nodes: GraphNode[] = [
    { id: 'start', type: 'start', x: 60, y: 240 },
    { id: 'w1', type: 'wait', delayMinutes: 60, untilReply: true, x: 340, y: 240 },
    { id: 'm1', type: 'message', text: 'Oie! Consegue conversar agora ou prefere outro momento?', x: 620, y: 140 },
    { id: 'w2', type: 'wait', delayMinutes: 180, untilReply: true, x: 900, y: 140 },
    { id: 'm2', type: 'message', text: 'Fiquei aguardando sua confirmação para seguir com seu orçamento. Me avisa quando puder!', x: 1180, y: 60 },
    { id: 'tag', type: 'action', action: 'tag', value: 'NÃO RESPONDEU', x: 1460, y: 60 },
    { id: 'stopEnd', type: 'stop', x: 1740, y: 60 },
    { id: 'stopReply', type: 'stop', x: 620, y: 380 },
  ];
  const edges: GraphEdge[] = [
    { from: 'start', fromHandle: 'out', to: 'w1' },
    { from: 'w1', fromHandle: 'timeout', to: 'm1' },
    { from: 'w1', fromHandle: 'reply', to: 'stopReply' },
    { from: 'm1', fromHandle: 'out', to: 'w2' },
    { from: 'w2', fromHandle: 'timeout', to: 'm2' },
    { from: 'w2', fromHandle: 'reply', to: 'stopReply' },
    { from: 'm2', fromHandle: 'out', to: 'tag' },
    { from: 'tag', fromHandle: 'out', to: 'stopEnd' },
  ];
  return { nodes, edges };
}
