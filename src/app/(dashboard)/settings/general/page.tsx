'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  XCircle,
  Plus,
  Trash2,
  Loader2,
  GripVertical,
  Building2,
} from 'lucide-react';
import { lossReasonsService } from '@/features/settings/services/loss-reasons.service';
import { organizationService } from '@/features/settings/services/organization.service';
import { useAuthStore } from '@/stores/auth-store';

export default function SettingsGeneralPage() {
  const qc = useQueryClient();

  // ── Organização (nome) ───────────────────────────────────────────
  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ['org-current'],
    queryFn: () => organizationService.getCurrent(),
    staleTime: 60_000,
  });
  const [orgName, setOrgName] = useState('');
  useEffect(() => {
    if (org?.name) setOrgName(org.name);
  }, [org?.name]);

  const saveOrg = useMutation({
    mutationFn: () => organizationService.updateName(orgName.trim()),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['org-current'] });
      // Reflete o novo nome no seletor do menu (sidebar) sem recarregar.
      const { user, organizations } = useAuthStore.getState();
      if (user) {
        useAuthStore
          .getState()
          .setAuth(
            user,
            organizations.map((o) =>
              o.id === saved.id ? { ...o, name: saved.name } : o,
            ),
          );
      }
      toast.success('Nome da organização atualizado');
    },
    onError: () => toast.error('Erro ao renomear a organização'),
  });

  const orgDirty = !!org && orgName.trim() !== '' && orgName.trim() !== org.name;

  // ── Motivos de perda ─────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['loss-reasons'],
    queryFn: () => lossReasonsService.get(),
    staleTime: 60_000,
  });
  const [reasons, setReasons] = useState<string[]>([]);

  useEffect(() => {
    if (data) setReasons(data);
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      lossReasonsService.set(reasons.map((r) => r.trim()).filter(Boolean)),
    onSuccess: (saved) => {
      setReasons(saved);
      qc.invalidateQueries({ queryKey: ['loss-reasons'] });
      toast.success('Motivos de perda salvos');
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  const setAt = (i: number, v: string) =>
    setReasons((arr) => arr.map((r, idx) => (idx === i ? v : r)));
  const removeAt = (i: number) =>
    setReasons((arr) => arr.filter((_, idx) => idx !== i));
  const add = () => setReasons((arr) => [...arr, '']);

  return (
    <div className="max-w-xl">
      {/* Organização */}
      <div className="mb-4 flex items-center gap-2">
        <Building2 className="h-5 w-5 text-zinc-500" />
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Organização
          </h2>
          <p className="text-xs text-zinc-500">
            Nome da empresa exibido no menu e nas telas do sistema.
          </p>
        </div>
      </div>

      {orgLoading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Nome da organização
            </label>
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Ex: Armazém Decora"
              maxLength={120}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <button
            onClick={() => saveOrg.mutate()}
            disabled={!orgDirty || saveOrg.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {saveOrg.isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
            Salvar
          </button>
        </div>
      )}

      <div className="my-8 border-t border-zinc-200 dark:border-zinc-800" />

      {/* Motivos de perda */}
      <div className="mb-4 flex items-center gap-2">
        <XCircle className="h-5 w-5 text-zinc-500" />
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Motivos de perda
          </h2>
          <p className="text-xs text-zinc-500">
            Opções mostradas ao mover um lead para uma etapa de <b>perdido</b>,
            para identificar pontos fracos.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {reasons.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 shrink-0 text-zinc-300" />
                <input
                  value={r}
                  onChange={(e) => setAt(i, e.target.value)}
                  placeholder="Motivo…"
                  className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
                <button
                  onClick={() => removeAt(i)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={add}
            className="mt-2 inline-flex items-center gap-1 rounded-md border border-dashed border-zinc-300 px-2.5 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar motivo
          </button>

          <div className="mt-5">
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Salvar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
