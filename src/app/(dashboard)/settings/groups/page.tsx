'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Users, X, Pencil } from 'lucide-react';
import {
  permissionGroupsService,
  RBAC_MODULES,
  type PermissionGroup,
  type ModulePerms,
} from '@/features/settings/services/permission-groups.service';
import { channelsService } from '@/features/channels/services/channels.service';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';

function emptyPerms(): ModulePerms {
  return Object.fromEntries(
    RBAC_MODULES.map((m) => [m.key, { view: false, edit: false, delete: false }]),
  );
}

export default function SettingsGroupsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<PermissionGroup | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['permission-groups'],
    queryFn: () => permissionGroupsService.list(),
  });

  const remove = useMutation({
    mutationFn: (id: string) => permissionGroupsService.remove(id),
    onSuccess: () => {
      toast.success('Grupo removido');
      qc.invalidateQueries({ queryKey: ['permission-groups'] });
    },
    onError: () => toast.error('Erro ao remover'),
  });

  return (
    <div className="max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Grupos de permissão
          </h2>
          <p className="text-sm text-zinc-500">
            Defina o que cada grupo pode ver, editar e excluir; depois vincule ao
            usuário na aba Membros. Proprietário e Admin têm acesso total.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Novo grupo
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-zinc-400">Carregando…</p>
      ) : groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-400 dark:border-zinc-700">
          Nenhum grupo ainda. Crie um para restringir o acesso de agentes.
        </p>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => (
            <div
              key={g.id}
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{g.name}</p>
                <p className="text-xs text-zinc-500">
                  {g.description || '—'} ·{' '}
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" /> {g._count?.members ?? 0} membro(s)
                  </span>{' '}
                  · Canais: {g.allChannels ? 'todos' : g.channelIds.length} · Funis:{' '}
                  {g.allPipelines ? 'todos' : g.pipelineIds.length}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditing(g)}
                  className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() =>
                    confirm(`Remover o grupo "${g.name}"?`) && remove.mutate(g.id)
                  }
                  className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                  title="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <GroupEditor
          group={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            qc.invalidateQueries({ queryKey: ['permission-groups'] });
          }}
        />
      )}
    </div>
  );
}

function GroupEditor({
  group,
  onClose,
  onSaved,
}: {
  group: PermissionGroup | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(group?.name ?? '');
  const [description, setDescription] = useState(group?.description ?? '');
  const [perms, setPerms] = useState<ModulePerms>(
    () => ({ ...emptyPerms(), ...(group?.modulePerms ?? {}) }),
  );
  const [allChannels, setAllChannels] = useState(group?.allChannels ?? true);
  const [channelIds, setChannelIds] = useState<string[]>(group?.channelIds ?? []);
  const [allPipelines, setAllPipelines] = useState(group?.allPipelines ?? true);
  const [pipelineIds, setPipelineIds] = useState<string[]>(group?.pipelineIds ?? []);

  const { data: channels = [] } = useQuery({
    queryKey: ['channels'],
    queryFn: () => channelsService.list(),
    staleTime: 60_000,
  });
  const { data: pipelines = [] } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => pipelinesService.list(),
    staleTime: 60_000,
  });

  const setPerm = (key: string, field: 'view' | 'edit' | 'delete', val: boolean) =>
    setPerms((p) => {
      const cur = p[key] ?? { view: false, edit: false, delete: false };
      const next = { ...cur, [field]: val };
      // marcar editar/excluir implica ver
      if ((field === 'edit' || field === 'delete') && val) next.view = true;
      if (field === 'view' && !val) {
        next.edit = false;
        next.delete = false;
      }
      return { ...p, [key]: next };
    });

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const save = useMutation({
    mutationFn: () => {
      const dto = {
        name: name.trim(),
        description: description.trim() || null,
        modulePerms: perms,
        allChannels,
        channelIds: allChannels ? [] : channelIds,
        allPipelines,
        pipelineIds: allPipelines ? [] : pipelineIds,
      };
      return group
        ? permissionGroupsService.update(group.id, dto)
        : permissionGroupsService.create(dto);
    },
    onSuccess: () => {
      toast.success(group ? 'Grupo atualizado' : 'Grupo criado');
      onSaved();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'Erro ao salvar'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {group ? 'Editar grupo' : 'Novo grupo'}
          </h3>
          <button onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">Nome</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Atendimento"
                className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">Descrição</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opcional"
                className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Matriz de permissões */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Permissões por módulo</p>
            <div className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-900/50">
                    <th className="px-3 py-2 text-left font-medium">Módulo</th>
                    <th className="px-3 py-2 text-center font-medium">Ver</th>
                    <th className="px-3 py-2 text-center font-medium">Editar</th>
                    <th className="px-3 py-2 text-center font-medium">Excluir</th>
                  </tr>
                </thead>
                <tbody>
                  {RBAC_MODULES.map((m) => {
                    const p = perms[m.key] ?? { view: false, edit: false, delete: false };
                    return (
                      <tr key={m.key} className="border-t border-zinc-100 dark:border-zinc-800">
                        <td className="px-3 py-1.5 text-zinc-800 dark:text-zinc-200">{m.label}</td>
                        {(['view', 'edit', 'delete'] as const).map((f) => (
                          <td key={f} className="px-3 py-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={p[f]}
                              onChange={(e) => setPerm(m.key, f, e.target.checked)}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Canais */}
          <ScopeSelector
            title="Canais (inboxes)"
            allLabel="Todos os canais"
            all={allChannels}
            setAll={setAllChannels}
            options={channels.map((c) => ({ id: c.id, label: `${c.name} (${c.type})` }))}
            selected={channelIds}
            onToggle={(id) => setChannelIds((l) => toggle(l, id))}
          />

          {/* Funis */}
          <ScopeSelector
            title="Funis (pipelines)"
            allLabel="Todos os funis"
            all={allPipelines}
            setAll={setAllPipelines}
            options={pipelines.map((p) => ({ id: p.id, label: p.name }))}
            selected={pipelineIds}
            onToggle={(id) => setPipelineIds((l) => toggle(l, id))}
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
          <button onClick={onClose} className="rounded-md px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">
            Cancelar
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || !name.trim()}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {save.isPending ? 'Salvando…' : 'Salvar grupo'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScopeSelector({
  title,
  allLabel,
  all,
  setAll,
  options,
  selected,
  onToggle,
}: {
  title: string;
  allLabel: string;
  all: boolean;
  setAll: (v: boolean) => void;
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</p>
      <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />
        {allLabel}
      </label>
      {!all && (
        <div className="mt-2 grid max-h-40 grid-cols-2 gap-1 overflow-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
          {options.length === 0 && (
            <span className="text-xs text-zinc-400">Nenhum disponível</span>
          )}
          {options.map((o) => (
            <label key={o.id} className="flex items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <input
                type="checkbox"
                checked={selected.includes(o.id)}
                onChange={() => onToggle(o.id)}
              />
              <span className="truncate">{o.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
