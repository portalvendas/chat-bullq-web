'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, ShieldCheck, ShieldAlert, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { aiKeyService } from '../services/ai-settings.service';

/**
 * Card de configuração da chave da API do Claude (Anthropic) desta empresa.
 * BYOK: cada empresa usa a própria chave/consumo. A chave nunca volta do
 * servidor — só um mascarado. Salvar valida a chave na Anthropic antes de gravar.
 */
export function AiKeyCard() {
  const qc = useQueryClient();
  const { data: status, isLoading } = useQuery({
    queryKey: ['ai-key-status'],
    queryFn: () => aiKeyService.getStatus(),
  });

  const [value, setValue] = useState('');

  const saveMut = useMutation({
    mutationFn: (key: string) => aiKeyService.setKey(key),
    onSuccess: () => {
      setValue('');
      qc.invalidateQueries({ queryKey: ['ai-key-status'] });
      toast.success('Chave do Claude salva e validada.');
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar a chave'),
  });

  const removeMut = useMutation({
    mutationFn: () => aiKeyService.removeKey(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-key-status'] });
      toast.success('Chave removida.');
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : 'Falha ao remover a chave'),
  });

  const configured = status?.configured ?? false;
  const busy = saveMut.isPending || removeMut.isPending;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-1 flex items-center gap-2">
        <KeyRound className="size-5 text-indigo-600" />
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Chave da API do Claude
        </h2>
      </div>
      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        A IA desta empresa usa a sua própria chave da Anthropic (consumo cobrado
        na sua conta). Sem uma chave configurada, os recursos de IA ficam
        indisponíveis. Pegue sua chave em{' '}
        <span className="font-mono">console.anthropic.com</span> (começa com{' '}
        <span className="font-mono">sk-ant-</span>).
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="size-4 animate-spin" /> Carregando…
        </div>
      ) : (
        <>
          <div className="mb-3">
            {configured ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                <ShieldCheck className="size-4" /> Configurada · {status?.hint}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-sm font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                <ShieldAlert className="size-4" /> Nenhuma chave configurada — IA
                indisponível
              </span>
            )}
          </div>

          {status && !status.encryptedAtRest && (
            <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-400">
              Atenção: a criptografia em repouso está desligada (ENCRYPTION_KEY
              ausente no servidor). A chave será gravada sem cifra até isso ser
              configurado.
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="password"
              autoComplete="off"
              placeholder={configured ? 'Colar nova chave para substituir' : 'sk-ant-...'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <button
              type="button"
              disabled={busy || value.trim().length < 10}
              onClick={() => saveMut.mutate(value.trim())}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saveMut.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {configured ? 'Substituir' : 'Salvar'} e testar
            </button>
            {configured && (
              <button
                type="button"
                disabled={busy}
                onClick={() => removeMut.mutate()}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:hover:bg-red-950"
              >
                <Trash2 className="size-4" /> Remover
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            A chave é validada com a Anthropic antes de salvar e guardada
            criptografada. Nunca é exibida de volta — só os últimos 4 dígitos.
          </p>
        </>
      )}
    </div>
  );
}
