'use client';

import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  Handle,
  Position,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import {
  Play,
  MessageSquare,
  Clock,
  Zap,
  Square,
  Trash2,
  LayoutGrid,
} from 'lucide-react';
import type {
  WorkflowGraph,
  GraphNode,
  GraphNodeType,
  NodeHandle,
} from '@/features/cadences/services/cadences.service';
import { templatesService } from '@/features/templates/services/templates.service';

/** Templates aprovados disponíveis para os nós de mensagem (fora de 24h). */
const TemplatesCtx = createContext<Array<{ id: string; name: string }>>([]);

const TYPE_META: Record<
  GraphNodeType,
  { label: string; icon: React.ElementType; color: string }
> = {
  start: { label: 'Iniciar robô', icon: Play, color: '#10b981' },
  message: { label: 'Enviar mensagem', icon: MessageSquare, color: '#3b82f6' },
  wait: { label: 'Pausar', icon: Clock, color: '#f59e0b' },
  action: { label: 'Ação', icon: Zap, color: '#8b5cf6' },
  stop: { label: 'Parar robô', icon: Square, color: '#ef4444' },
};

const HANDLE_COLOR: Record<NodeHandle, string> = {
  out: '#94a3b8',
  timeout: '#f59e0b',
  reply: '#ef4444',
};

interface SalesData {
  kind: GraphNodeType;
  text?: string;
  templateId?: string;
  mediaUrl?: string;
  mediaType?: 'DOCUMENT' | 'IMAGE';
  fileName?: string;
  delayMinutes?: number;
  untilReply?: boolean;
  businessHoursOnly?: boolean;
  action?: 'tag' | 'move_stage' | 'close';
  value?: string;
}

function uid(prefix: string): string {
  return `${prefix}${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Nó customizado ───────────────────────────────
const SalesNode = memo(({ id, data, selected }: NodeProps) => {
  const { updateNodeData, deleteElements } = useReactFlow();
  const templates = useContext(TemplatesCtx);
  const d = data as unknown as SalesData;
  const M = TYPE_META[d.kind];
  const Icon = M.icon;
  const patch = (p: Partial<SalesData>) => updateNodeData(id, p);

  return (
    <div
      className={`w-[230px] rounded-lg border bg-white shadow-sm dark:bg-zinc-950 ${
        selected
          ? 'border-primary ring-1 ring-primary'
          : 'border-zinc-300 dark:border-zinc-700'
      }`}
    >
      {d.kind !== 'start' && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-3 !w-3 !border-2 !border-white !bg-zinc-400 dark:!border-zinc-900"
        />
      )}

      <div
        className="flex items-center gap-1.5 rounded-t-lg px-2 py-1.5 text-xs font-semibold text-white"
        style={{ background: M.color }}
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="flex-1 truncate">{M.label}</span>
        {d.kind !== 'start' && (
          <button
            className="nodrag rounded p-0.5 hover:bg-white/20"
            onClick={() => deleteElements({ nodes: [{ id }] })}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="space-y-1.5 px-2 py-2">
        {d.kind === 'message' && (
          <>
            <textarea
              value={d.text ?? ''}
              onChange={(e) => patch({ text: e.target.value })}
              rows={2}
              placeholder="Mensagem ao cliente (dentro de 24h)…"
              className="nodrag w-full resize-y rounded border border-zinc-300 px-1.5 py-1 text-xs outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <select
              value={d.templateId ?? ''}
              onChange={(e) => patch({ templateId: e.target.value || undefined })}
              title="Template aprovado usado quando fora da janela de 24h (WhatsApp)"
              className="nodrag mt-1 w-full rounded border border-zinc-300 px-1 py-0.5 text-[11px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <option value="">Fora de 24h: (sem template)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {/* Anexo (catálogo/PDF/imagem) — enviado dentro da janela de 24h */}
            <input
              value={d.mediaUrl ?? ''}
              onChange={(e) => patch({ mediaUrl: e.target.value || undefined })}
              placeholder="Anexo: URL do PDF/catálogo/imagem (opcional)"
              title="Arquivo enviado como documento/imagem dentro das 24h. O texto acima vira legenda."
              className="nodrag w-full rounded border border-zinc-300 px-1.5 py-1 text-[11px] outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            {d.mediaUrl?.trim() && (
              <div className="flex items-center gap-1">
                <select
                  value={d.mediaType ?? 'DOCUMENT'}
                  onChange={(e) =>
                    patch({ mediaType: e.target.value as 'DOCUMENT' | 'IMAGE' })
                  }
                  className="nodrag rounded border border-zinc-300 px-1 py-0.5 text-[11px] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  <option value="DOCUMENT">Documento</option>
                  <option value="IMAGE">Imagem</option>
                </select>
                {d.mediaType !== 'IMAGE' && (
                  <input
                    value={d.fileName ?? ''}
                    onChange={(e) =>
                      patch({ fileName: e.target.value || undefined })
                    }
                    placeholder="nome-do-arquivo.pdf"
                    className="nodrag flex-1 rounded border border-zinc-300 px-1.5 py-0.5 text-[11px] outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                )}
              </div>
            )}
          </>
        )}
        {d.kind === 'wait' && (
          <>
            <div className="flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-300">
              <input
                type="number"
                min={0}
                value={d.delayMinutes ?? 0}
                onChange={(e) => patch({ delayMinutes: Number(e.target.value) })}
                className="nodrag w-16 rounded border border-zinc-300 px-1 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
              />
              min de espera
            </div>
            <label className="flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={!!d.untilReply}
                onChange={(e) => patch({ untilReply: e.target.checked })}
                className="nodrag"
              />
              até o cliente responder
            </label>
            <label className="flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={!!d.businessHoursOnly}
                onChange={(e) => patch({ businessHoursOnly: e.target.checked })}
                className="nodrag"
              />
              só em horário comercial
            </label>
            <div className="flex justify-end gap-3 pr-1 text-[9px] font-medium">
              <span style={{ color: HANDLE_COLOR.timeout }}>tempo ▸</span>
              <span style={{ color: HANDLE_COLOR.reply }}>respondeu ▸</span>
            </div>
          </>
        )}
        {d.kind === 'action' && (
          <>
            <select
              value={d.action ?? 'tag'}
              onChange={(e) =>
                patch({ action: e.target.value as SalesData['action'] })
              }
              className="nodrag w-full rounded border border-zinc-300 px-1 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="tag">Aplicar tag</option>
              <option value="move_stage">Mover etapa</option>
              <option value="close">Encerrar conversa</option>
            </select>
            {d.action !== 'close' && (
              <input
                value={d.value ?? ''}
                onChange={(e) => patch({ value: e.target.value })}
                placeholder={d.action === 'tag' ? 'Nome da tag' : 'ID da etapa'}
                className="nodrag w-full rounded border border-zinc-300 px-1.5 py-1 text-xs outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            )}
          </>
        )}
        {d.kind === 'start' && (
          <p className="text-[11px] text-zinc-400">Ponto de entrada do bot.</p>
        )}
        {d.kind === 'stop' && (
          <p className="text-[11px] text-zinc-400">Fim do fluxo.</p>
        )}
      </div>

      {/* Handles de saída */}
      {d.kind === 'wait' ? (
        <>
          <Handle
            type="source"
            id="timeout"
            position={Position.Right}
            style={{ top: '38%', background: HANDLE_COLOR.timeout }}
            className="!h-3 !w-3 !border-2 !border-white dark:!border-zinc-900"
          />
          <Handle
            type="source"
            id="reply"
            position={Position.Right}
            style={{ top: '68%', background: HANDLE_COLOR.reply }}
            className="!h-3 !w-3 !border-2 !border-white dark:!border-zinc-900"
          />
        </>
      ) : d.kind !== 'stop' ? (
        <Handle
          type="source"
          id="out"
          position={Position.Right}
          className="!h-3 !w-3 !border-2 !border-white !bg-zinc-400 dark:!border-zinc-900"
        />
      ) : null}
    </div>
  );
});
SalesNode.displayName = 'SalesNode';

const nodeTypes = { sales: SalesNode };

// ─── Conversão grafo ⇄ React Flow ─────────────────
function toRf(graph: WorkflowGraph): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = (graph.nodes ?? []).map((n) => ({
    id: n.id,
    type: 'sales',
    position: { x: n.x ?? 0, y: n.y ?? 0 },
    data: {
      kind: n.type,
      text: n.text,
      templateId: n.templateId,
      mediaUrl: n.mediaUrl,
      mediaType: n.mediaType,
      fileName: n.fileName,
      delayMinutes: n.delayMinutes,
      untilReply: n.untilReply,
      businessHoursOnly: n.businessHoursOnly,
      action: n.action,
      value: n.value,
    },
  }));
  const edges: Edge[] = (graph.edges ?? []).map((e, i) => {
    const h = (e.fromHandle ?? 'out') as NodeHandle;
    return {
      id: e.id ?? `${e.from}-${h}-${e.to}-${i}`,
      source: e.from,
      target: e.to,
      sourceHandle: h,
      animated: h === 'reply',
      style: { stroke: HANDLE_COLOR[h], strokeWidth: 2 },
    };
  });
  return { nodes, edges };
}

function toGraph(nodes: Node[], edges: Edge[]): WorkflowGraph {
  return {
    nodes: nodes.map((n) => {
      const d = n.data as unknown as SalesData;
      const gn: GraphNode = {
        id: n.id,
        type: d.kind,
        x: Math.round(n.position.x),
        y: Math.round(n.position.y),
      };
      if (d.kind === 'message') {
        gn.text = d.text ?? '';
        if (d.templateId) gn.templateId = d.templateId;
        if (d.mediaUrl?.trim()) {
          gn.mediaUrl = d.mediaUrl.trim();
          gn.mediaType = d.mediaType ?? 'DOCUMENT';
          if (d.fileName?.trim()) gn.fileName = d.fileName.trim();
        }
      } else if (d.kind === 'wait') {
        gn.delayMinutes = Number(d.delayMinutes) || 0;
        gn.untilReply = !!d.untilReply;
        gn.businessHoursOnly = !!d.businessHoursOnly;
      } else if (d.kind === 'action') {
        gn.action = d.action ?? 'tag';
        if (d.value) gn.value = d.value;
      }
      return gn;
    }),
    edges: edges.map((e) => ({
      from: e.source,
      fromHandle: (e.sourceHandle ?? 'out') as NodeHandle,
      to: e.target,
    })),
  };
}

function dagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 44, ranksep: 110 });
  nodes.forEach((n) => g.setNode(n.id, { width: 230, height: 130 }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map((n) => {
    const p = g.node(n.id);
    return p ? { ...n, position: { x: p.x - 115, y: p.y - 65 } } : n;
  });
}

// ─── Canvas ───────────────────────────────────────
function CanvasInner({
  graph,
  onChange,
}: {
  graph: WorkflowGraph;
  onChange: (g: WorkflowGraph) => void;
}) {
  const initial = useMemo(() => toRf(graph), []); // init 1x; depois é interno
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const { fitView } = useReactFlow();

  // Templates aprovados p/ os nós de mensagem (envio fora de 24h).
  const { data: tplData } = useQuery({
    queryKey: ['wa-templates-approved'],
    queryFn: () => templatesService.list({ status: 'APPROVED', pageSize: 200 }),
    staleTime: 60_000,
  });
  const templateOptions = useMemo(
    () => (tplData?.items ?? []).map((t) => ({ id: t.id, name: t.name })),
    [tplData],
  );

  // Sincroniza estado interno → grafo do editor (para o Salvar).
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    onChange(toGraph(nodes, edges));
  }, [nodes, edges]); // eslint-disable-line react-hooks/exhaustive-deps

  const onConnect = useCallback(
    (c: Connection) => {
      const h = (c.sourceHandle ?? 'out') as NodeHandle;
      setEdges((eds) => {
        const filtered = eds.filter(
          (e) => !(e.source === c.source && (e.sourceHandle ?? 'out') === h),
        );
        return addEdge(
          {
            ...c,
            animated: h === 'reply',
            style: { stroke: HANDLE_COLOR[h], strokeWidth: 2 },
          },
          filtered,
        );
      });
    },
    [setEdges],
  );

  const addNode = useCallback(
    (kind: GraphNodeType) => {
      const data: SalesData = { kind };
      if (kind === 'wait') {
        data.delayMinutes = 60;
        data.untilReply = true;
      }
      if (kind === 'action') data.action = 'tag';
      const n: Node = {
        id: uid(kind[0]),
        type: 'sales',
        position: { x: 120 + Math.random() * 80, y: 120 + Math.random() * 80 },
        data: data as unknown as Record<string, unknown>,
      };
      setNodes((nds) => [...nds, n]);
    },
    [setNodes],
  );

  const autoLayout = useCallback(() => {
    setNodes((nds) => dagreLayout(nds, edges));
    setTimeout(() => fitView({ duration: 300 }), 60);
  }, [edges, setNodes, fitView]);

  return (
    <TemplatesCtx.Provider value={templateOptions}>
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      fitView
      minZoom={0.1}
      deleteKeyCode={['Delete', 'Backspace']}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
      <Controls />
      <MiniMap
        pannable
        zoomable
        nodeColor={(n) =>
          TYPE_META[(n.data as any)?.kind as GraphNodeType]?.color ?? '#94a3b8'
        }
        className="!rounded-xl !border !border-zinc-200 dark:!border-zinc-700"
      />
      <Panel position="top-left" className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-medium text-zinc-500">Adicionar:</span>
        {(['message', 'wait', 'action', 'stop'] as GraphNodeType[]).map((t) => {
          const Ico = TYPE_META[t].icon;
          return (
            <button
              key={t}
              onClick={() => addNode(t)}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <Ico className="h-3.5 w-3.5" style={{ color: TYPE_META[t].color }} />
              {TYPE_META[t].label}
            </button>
          );
        })}
        <button
          onClick={autoLayout}
          title="Auto-organizar o fluxo"
          className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <LayoutGrid className="h-3.5 w-3.5" /> Auto-organizar
        </button>
      </Panel>
    </ReactFlow>
    </TemplatesCtx.Provider>
  );
}

/**
 * Canvas do salesbot em React Flow: zoom, pan, minimapa, controles e
 * auto-organização (dagre). Mesmo contrato do editor anterior ({graph,onChange}).
 * A espera bifurca em duas saídas: "tempo" (cronômetro) e "respondeu" (cliente).
 */
export function SalesbotCanvas({
  graph,
  onChange,
}: {
  graph: WorkflowGraph;
  onChange: (g: WorkflowGraph) => void;
}) {
  return (
    <ReactFlowProvider>
      <CanvasInner graph={graph} onChange={onChange} />
    </ReactFlowProvider>
  );
}
