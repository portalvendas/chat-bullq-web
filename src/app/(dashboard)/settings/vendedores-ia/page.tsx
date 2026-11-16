'use client';

/**
 * Configurações → Vendedores IA. CRUD de vendedores virtuais: cada um é
 * atendido por um agente de IA e entra no rodízio de distribuição como
 * qualquer vendedor (o peso é definido na aba Distribuição). Quando um lead
 * cai nele, o agente assume a conversa em modo revisão (copiloto).
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bot, Plus, Loader2, Trash2, X, AlertTriangle, Pencil } from 'lucide-react';
import {
  virtualSellersService,
  type VirtualSeller,
} from '@/features/settings/services/virtual-sellers.service';
import {
  aiAgentsService,
  type AiAgent,
} from '@/features/ai-agents/services/ai-agents.service';

export default function VendedoresIaPage() {
  const qc = useQueryClient();
  const { data: sellers, isLoading } = useQuery({
    queryKey: ['virtual-sellers'],
    queryFn: () => virtualSellersService.list(),
    staleTime: 30_000,
  });
  const { data: agents } = useQuery({
    queryKey: ['ai-agents', 'list'],
    queryFn: () => aiAgentsService.list(),
    staleTime: 60_000,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VirtualSeller | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => virtualSellersService.remove(id),
    onSuccess: () => {
      toast.success('Vendedor IA removido');
      qc.invalidateQueries({ queryKey: ['virtual-sellers'] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? 'Erro ao remover'),
  });

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (s: VirtualSeller) => {
    setEditing(s);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            <Bot className="h-5 w-5" /> Vendedores IA
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Um vendedor virtual é atendido por um agente de IA. Ele entra no
            rodízio de distribuição como qualquer vendedor; quando um lead cai
            nele, o agente assume a conversa em modo revisão (copiloto) — os
            rascunhos vão pra fila de aprovação no inbox. Depois de criar, dê um
            peso a ele na aba <span className="font-medium">Distribuição</span>.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Vendedor IA
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" /> carregando…
        </div>
      ) : !sellers?.length ? (
        <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-400 dark:border-zinc-700">
          Nenhum vendedor IA ainda. Crie um e ligue a um agente.
        </div>
      ) : (
        <div className="space-y-2">
          {sellers.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
                    {s.user?.name}
                  </span>
                  <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                    IA
                  </span>
                  {s.user?.isActive === false && (
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800">
                      inativo
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {s.aiAgent ? (
                    <>
                      Agente:{' '}
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {s.aiAgent.name}
                      </span>
                      {s.aiAgent.isActive === false && ' (inativo)'}
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      <AlertTriangle className="h-3 w-3" /> sem agente vinculado
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(s)}
                  className="rounded-md p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Remover o vendedor IA "${s.user?.name}"?`))
                      remove.mutate(s.id);
                  }}
                  className="rounded-md p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                  title="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <SellerModal
          seller={editing}
          agents={agents ?? []}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            qc.invalidateQueries({ queryKey: ['virtual-sellers'] });
          }}
        />
      )}
    </div>
  );
}

function SellerModal({
  seller,
  agents,
  onClose,
  onSaved,
}: {
  seller: VirtualSeller | null;
  agents: AiAgent[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!seller;
  const [name, setName] = useState(seller?.user?.name ?? '');
  const [aiAgentId, setAiAgentId] = useState(seller?.aiAgentId ?? '');

  const save = useMutation({
    mutationFn: () =>
      isEdit
        ? virtualSellersService.update(seller!.id, { name: name.trim(), aiAgentId })
        : virtualSellersService.create({ name: name.trim(), aiAgentId }),
    onSuccess: () => {
      toast.success(isEdit ? 'Vendedor IA atualizado' : 'Vendedor IA criado');
      onSaved();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? 'Erro ao salvar'),
  });

  const canSave = name.trim().length > 1 && !!aiAgentId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            <Bot className="h-4 w-4" />{' '}
            {isEdit ? 'Editar vendedor IA' : 'Novo vendedor IA'}
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Nome
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Vendedor IA — Inbound"
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />

        <label className="mt-4 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Agente de IA
        </label>
        <select
          value={aiAgentId}
          onChange={(e) => setAiAgentId(e.target.value)}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        >
          <option value="">Selecione um agente…</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.isActive === false ? ' (inativo)' : ''}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-zinc-400">
          O agente responde os leads deste vendedor em modo revisão (copiloto).
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={!canSave || save.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
}
