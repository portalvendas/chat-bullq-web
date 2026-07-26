'use client';

import { useRef, useState, useCallback } from 'react';
import {
  Play,
  MessageSquare,
  Clock,
  Zap,
  Square,
  Trash2,
  Plus,
} from 'lucide-react';
import type {
  WorkflowGraph,
  GraphNode,
  GraphNodeType,
  NodeHandle,
} from '@/features/cadences/services/cadences.service';

const NODE_W = 230;
const HANDLE_Y = 30; // y do handle "out"/entrada relativo ao topo do nó
const REPLY_DY = 26; // deslocamento do 2º handle (reply) nos nós de espera

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

function uid(prefix: string): string {
  return `${prefix}${Math.random().toString(36).slice(2, 8)}`;
}

/** Handles de saída de um nó (por tipo). */
function outHandles(type: GraphNodeType): NodeHandle[] {
  if (type === 'wait') return ['timeout', 'reply'];
  if (type === 'stop') return [];
  return ['out'];
}

function handlePos(node: GraphNode, handle: NodeHandle) {
  const x = (node.x ?? 0) + NODE_W;
  let y = (node.y ?? 0) + HANDLE_Y;
  if (handle === 'reply') y += REPLY_DY;
  return { x, y };
}
function inputPos(node: GraphNode) {
  return { x: node.x ?? 0, y: (node.y ?? 0) + HANDLE_Y };
}

const HANDLE_LABEL: Record<NodeHandle, string> = {
  out: '',
  timeout: 'tempo',
  reply: 'respondeu',
};

/**
 * Canvas visual do salesbot (estilo Kommo). Nós arrastáveis conectados por
 * arestas. Espera bifurca em "tempo" (cronômetro) e "respondeu" (cliente
 * respondeu). Auto-contido: sem dependências externas de grafo.
 */
export function SalesbotCanvas({
  graph,
  onChange,
}: {
  graph: WorkflowGraph;
  onChange: (g: WorkflowGraph) => void;
}) {
  const nodes = graph.nodes ?? [];
  const edges = graph.edges ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<{ from: string; handle: NodeHandle } | null>(
    null,
  );
  const dragRef = useRef<{
    id: string;
    px: number;
    py: number;
    nx: number;
    ny: number;
  } | null>(null);

  const patchNode = useCallback(
    (id: string, patch: Partial<GraphNode>) => {
      onChange({
        ...graph,
        nodes: nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      });
    },
    [graph, nodes, onChange],
  );

  const addNode = (type: GraphNodeType) => {
    const id = uid(type[0]);
    const base: GraphNode = {
      id,
      type,
      x: 120 + Math.round(Math.random() * 60),
      y: 320 + Math.round(Math.random() * 60),
    };
    if (type === 'wait') {
      base.delayMinutes = 60;
      base.untilReply = true;
    }
    if (type === 'action') base.action = 'tag';
    onChange({ ...graph, nodes: [...nodes, base] });
    setSelected(id);
  };

  const removeNode = (id: string) => {
    onChange({
      nodes: nodes.filter((n) => n.id !== id),
      edges: edges.filter((e) => e.from !== id && e.to !== id),
    });
    setSelected((s) => (s === id ? null : s));
  };

  const removeEdge = (idx: number) => {
    onChange({ ...graph, edges: edges.filter((_, i) => i !== idx) });
  };

  const connectFromTo = (from: string, handle: NodeHandle, to: string) => {
    if (from === to) return;
    // uma saída (from+handle) só aponta pra um destino → substitui
    const filtered = edges.filter(
      (e) => !(e.from === from && (e.fromHandle ?? 'out') === handle),
    );
    onChange({
      ...graph,
      edges: [...filtered, { from, fromHandle: handle, to }],
    });
  };

  // ── drag ──
  const onNodePointerDown = (e: React.PointerEvent, node: GraphNode) => {
    if (connecting) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      id: node.id,
      px: e.clientX,
      py: e.clientY,
      nx: node.x ?? 0,
      ny: node.y ?? 0,
    };
  };
  const onNodePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    patchNode(d.id, { x: Math.max(0, d.nx + dx), y: Math.max(0, d.ny + dy) });
  };
  const onNodePointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };

  const onNodeClick = (node: GraphNode) => {
    if (connecting) {
      connectFromTo(connecting.from, connecting.handle, node.id);
      setConnecting(null);
    } else {
      setSelected(node.id);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
        <span className="mr-1 text-xs font-medium text-zinc-500">Adicionar:</span>
        {(['message', 'wait', 'action', 'stop'] as GraphNodeType[]).map((t) => {
          const M = TYPE_META[t];
          const Icon = M.icon;
          return (
            <button
              key={t}
              onClick={() => addNode(t)}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <Icon className="h-3.5 w-3.5" style={{ color: M.color }} /> {M.label}
            </button>
          );
        })}
        {connecting && (
          <span className="ml-auto rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
            Clique no nó de destino… (ESC cancela)
          </span>
        )}
      </div>

      {/* Área do canvas */}
      <div
        className="relative flex-1 overflow-auto bg-zinc-50 dark:bg-zinc-900"
        onClick={() => setConnecting(null)}
        onKeyDown={(e) => e.key === 'Escape' && setConnecting(null)}
        tabIndex={0}
      >
        <div className="relative" style={{ width: 2600, height: 1600 }}>
          {/* Grid sutil */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(120,120,120,0.18) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          />
          {/* Arestas */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            {edges.map((e, i) => {
              const from = nodes.find((n) => n.id === e.from);
              const to = nodes.find((n) => n.id === e.to);
              if (!from || !to) return null;
              const p1 = handlePos(from, e.fromHandle ?? 'out');
              const p2 = inputPos(to);
              const dx = Math.max(40, Math.abs(p2.x - p1.x) / 2);
              const path = `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;
              const stroke =
                e.fromHandle === 'reply'
                  ? '#ef4444'
                  : e.fromHandle === 'timeout'
                    ? '#f59e0b'
                    : '#94a3b8';
              return (
                <g key={i}>
                  <path
                    d={path}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={12}
                    className="pointer-events-auto cursor-pointer"
                    onClick={() => removeEdge(i)}
                  />
                  <path d={path} fill="none" stroke={stroke} strokeWidth={2} />
                </g>
              );
            })}
          </svg>

          {/* Nós */}
          {nodes.map((node) => {
            const M = TYPE_META[node.type];
            const Icon = M.icon;
            const isSel = selected === node.id;
            return (
              <div
                key={node.id}
                className={`absolute rounded-lg border bg-white shadow-sm dark:bg-zinc-950 ${
                  isSel
                    ? 'border-primary ring-1 ring-primary'
                    : 'border-zinc-300 dark:border-zinc-700'
                }`}
                style={{ left: node.x ?? 0, top: node.y ?? 0, width: NODE_W }}
                onClick={(ev) => {
                  ev.stopPropagation();
                  onNodeClick(node);
                }}
              >
                {/* Header (arrastável) */}
                <div
                  onPointerDown={(e) => onNodePointerDown(e, node)}
                  onPointerMove={onNodePointerMove}
                  onPointerUp={onNodePointerUp}
                  className="flex cursor-grab items-center gap-1.5 rounded-t-lg px-2 py-1.5 text-xs font-semibold text-white active:cursor-grabbing"
                  style={{ background: M.color }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="flex-1 truncate">{M.label}</span>
                  {node.type !== 'start' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNode(node.id);
                      }}
                      className="rounded p-0.5 hover:bg-white/20"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Corpo por tipo */}
                <div className="space-y-1.5 px-2 py-2">
                  {node.type === 'message' && (
                    <textarea
                      value={node.text ?? ''}
                      onChange={(e) => patchNode(node.id, { text: e.target.value })}
                      onPointerDown={(e) => e.stopPropagation()}
                      rows={2}
                      placeholder="Mensagem ao cliente…"
                      className="w-full resize-y rounded border border-zinc-300 px-1.5 py-1 text-xs outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  )}
                  {node.type === 'wait' && (
                    <>
                      <div className="flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-300">
                        <input
                          type="number"
                          min={0}
                          value={node.delayMinutes ?? 0}
                          onChange={(e) =>
                            patchNode(node.id, { delayMinutes: Number(e.target.value) })
                          }
                          onPointerDown={(e) => e.stopPropagation()}
                          className="w-16 rounded border border-zinc-300 px-1 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                        />
                        min de espera
                      </div>
                      <label className="flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-300">
                        <input
                          type="checkbox"
                          checked={!!node.untilReply}
                          onChange={(e) =>
                            patchNode(node.id, { untilReply: e.target.checked })
                          }
                          onPointerDown={(e) => e.stopPropagation()}
                        />
                        até o cliente responder
                      </label>
                      <label className="flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-300">
                        <input
                          type="checkbox"
                          checked={!!node.businessHoursOnly}
                          onChange={(e) =>
                            patchNode(node.id, { businessHoursOnly: e.target.checked })
                          }
                          onPointerDown={(e) => e.stopPropagation()}
                        />
                        só em horário comercial
                      </label>
                    </>
                  )}
                  {node.type === 'action' && (
                    <>
                      <select
                        value={node.action ?? 'tag'}
                        onChange={(e) =>
                          patchNode(node.id, {
                            action: e.target.value as GraphNode['action'],
                          })
                        }
                        onPointerDown={(e) => e.stopPropagation()}
                        className="w-full rounded border border-zinc-300 px-1 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      >
                        <option value="tag">Aplicar tag</option>
                        <option value="move_stage">Mover etapa</option>
                        <option value="close">Encerrar conversa</option>
                      </select>
                      {node.action !== 'close' && (
                        <input
                          value={node.value ?? ''}
                          onChange={(e) => patchNode(node.id, { value: e.target.value })}
                          onPointerDown={(e) => e.stopPropagation()}
                          placeholder={node.action === 'tag' ? 'Nome da tag' : 'ID da etapa'}
                          className="w-full rounded border border-zinc-300 px-1.5 py-1 text-xs outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                      )}
                    </>
                  )}
                  {node.type === 'start' && (
                    <p className="text-[11px] text-zinc-400">Ponto de entrada do bot.</p>
                  )}
                  {node.type === 'stop' && (
                    <p className="text-[11px] text-zinc-400">Fim do fluxo.</p>
                  )}

                  {/* Handles de saída */}
                  {outHandles(node.type).map((h, hi) => (
                    <button
                      key={h}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConnecting({ from: node.id, handle: h });
                      }}
                      title={`Conectar saída${HANDLE_LABEL[h] ? ' (' + HANDLE_LABEL[h] + ')' : ''}`}
                      className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                        connecting?.from === node.id && connecting.handle === h
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-zinc-300 text-zinc-500 hover:border-primary hover:text-primary dark:border-zinc-700'
                      } ${hi > 0 ? 'ml-1' : ''}`}
                    >
                      <Plus className="h-2.5 w-2.5" />
                      {h === 'out' ? 'conectar' : HANDLE_LABEL[h]}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-zinc-200 bg-white px-3 py-1.5 text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
        Arraste o cabeçalho para mover · clique em <b>conectar</b>/<b>tempo</b>/<b>respondeu</b> e
        depois no nó de destino · clique numa linha para removê-la.
      </div>
    </div>
  );
}
