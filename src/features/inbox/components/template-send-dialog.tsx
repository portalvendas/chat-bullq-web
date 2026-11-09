'use client';

/**
 * Envio de TEMPLATE aprovado (WhatsApp Oficial) direto do inbox — o único
 * jeito de iniciar ou reabrir a conversa fora da janela de 24h. Lista só os
 * templates APROVADOS sem mídia no cabeçalho; {{1}}, {{2}}… viram campos
 * ({{1}} já vem com o 1º nome do cliente).
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Send, X } from 'lucide-react';
import { inboxService } from '../services/inbox.service';
import { templatesService, type WhatsappTemplate } from '@/features/templates/services/templates.service';

function varsOf(body: string): number {
  return Math.max(0, ...[...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1])));
}
function supported(t: WhatsappTemplate): boolean {
  const header = (t.components ?? []).find((c: any) => String(c?.type).toUpperCase() === 'HEADER') as any;
  if (!header) return true;
  if (String(header.format ?? 'TEXT').toUpperCase() !== 'TEXT') return false;
  return !/\{\{\d+\}\}/.test(header.text ?? '');
}

export function TemplateSendDialog({
  conversationId,
  contactName,
  onClose,
}: {
  conversationId: string;
  contactName?: string | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<WhatsappTemplate | null>(null);
  const [params, setParams] = useState<string[]>([]);
  const firstName = (contactName ?? '').trim().split(/\s+/)[0] ?? '';

  const { data, isLoading } = useQuery({
    queryKey: ['wa-templates-approved'],
    queryFn: () => templatesService.list({ status: 'APPROVED', pageSize: 200 }),
    staleTime: 60_000,
  });
  const templates = useMemo(() => (data?.items ?? []).filter(supported), [data]);

  const pick = (t: WhatsappTemplate) => {
    setSelected(t);
    const n = varsOf(t.bodyText);
    setParams(Array.from({ length: n }, (_, i) => (i === 0 ? firstName : '')));
  };

  const preview = selected
    ? selected.bodyText.replace(/\{\{(\d+)\}\}/g, (_m, n) => params[Number(n) - 1] || `{{${n}}}`)
    : '';
  const ready = !!selected && params.every((p) => p.trim());

  const send = useMutation({
    mutationFn: () =>
      inboxService.sendMessage({
        conversationId,
        type: 'TEMPLATE',
        content: { templateId: selected!.id, params },
      }),
    onSuccess: () => {
      toast.success('Template enviado');
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Não foi possível enviar o template'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Enviar template aprovado</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 sm:grid-cols-2">
          <ul className="min-h-0 overflow-y-auto border-b border-zinc-100 p-2 sm:border-b-0 sm:border-r dark:border-zinc-800">
            {isLoading ? (
              <li className="flex items-center gap-2 p-3 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" /> carregando…
              </li>
            ) : templates.length === 0 ? (
              <li className="p-3 text-sm text-zinc-500">
                Nenhum template aprovado disponível. Crie e envie para aprovação em <b>Modelos</b>.
              </li>
            ) : (
              templates.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => pick(t)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                      selected?.id === t.id ? 'bg-primary/10 text-primary' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="font-medium">{t.name}</div>
                    <div className="line-clamp-2 text-xs text-zinc-500">{t.bodyText}</div>
                  </button>
                </li>
              ))
            )}
          </ul>
          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto p-4">
            {!selected ? (
              <p className="text-sm text-zinc-400">Escolha um template ao lado.</p>
            ) : (
              <>
                {params.map((p, i) => (
                  <label key={i} className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    Variável {`{{${i + 1}}}`}
                    {i === 0 && firstName ? ' (nome do cliente)' : ''}
                    <input
                      value={p}
                      onChange={(e) => setParams(params.map((x, j) => (j === i ? e.target.value : x)))}
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </label>
                ))}
                <div className="rounded-lg bg-emerald-50 p-3 text-sm whitespace-pre-wrap text-zinc-800 dark:bg-emerald-950/30 dark:text-zinc-100">
                  {preview}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <button onClick={onClose} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
            Cancelar
          </button>
          <button
            onClick={() => send.mutate()}
            disabled={!ready || send.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {send.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
