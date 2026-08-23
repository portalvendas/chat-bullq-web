'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, ShieldCheck, ShieldAlert, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { platformAdminService } from '../services/platform-admin.service';

/** Gestão (suporte) da chave do Claude de UMA empresa, pelo Super Admin. */
export function SuperAdminAiKey({ id }: { id: string }) {
  const qc = useQueryClient();
  const key = ['sa-ai-key', id];
  const { data: status, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => platformAdminService.getAiKey(id),
  });
  const [value, setValue] = useState('');

  const saveMut = useMutation({
    mutationFn: (k: string) => platformAdminService.setAiKey(id, k),
    onSuccess: () => {
      setValue('');
      qc.invalidateQueries({ queryKey: key });
      toast.success('Chave do Claude salva.');
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar a chave'),
  });
  const removeMut = useMutation({
    mutationFn: () => platformAdminService.removeAiKey(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success('Chave removida.');
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : 'Falha ao remover'),
  });

  const configured = status?.configured ?? false;
  const busy = saveMut.isPending || removeMut.isPending;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        <KeyRound className="size-4" /> Chave do Claude (IA)
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="size-4 animate-spin" /> Carregando…
        </div>
      ) : (
        <>
          <div className="mb-2 text-sm">
            {configured ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-600">
                <ShieldCheck className="size-4" /> Configurada · {status?.hint}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-amber-600">
                <ShieldAlert className="size-4" /> Sem chave — IA indisponível
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              autoComplete="off"
              placeholder={configured ? 'Nova chave (substituir)' : 'sk-ant-...'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="flex-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button
              type="button"
              disabled={busy || value.trim().length < 10}
              onClick={() => saveMut.mutate(value.trim())}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saveMut.isPending ? '...' : 'Salvar'}
            </button>
            {configured && (
              <button
                type="button"
                disabled={busy}
                onClick={() => removeMut.mutate()}
                className="rounded-md border border-red-300 px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
