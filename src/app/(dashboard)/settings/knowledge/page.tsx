'use client';

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BookOpen,
  Check,
  Loader2,
  Pencil,
  Trash2,
  X,
  Store,
  Tag,
} from 'lucide-react';
import {
  knowledgeService,
  type KnowledgeItem,
  type KnowledgeStatus,
} from '@/features/knowledge/services/knowledge.service';

const TABS: { key: KnowledgeStatus; label: string }[] = [
  { key: 'PENDING', label: 'A validar' },
  { key: 'VALIDATED', label: 'Validados' },
  { key: 'ARCHIVED', label: 'Arquivados' },
];

const SOURCE_LABEL: Record<string, string> = {
  MANUAL: 'Manual',
  OPERATOR_COMPLEMENT: 'Complemento do operador',
  AD_SCAN: 'Varredura de anúncios',
  FILE_IMPORT: 'Import de arquivo',
};

export default function KnowledgePage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<KnowledgeStatus>('PENDING');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<KnowledgeItem | null>(null);
  const [editText, setEditText] = useState('');

  const { data: counts } = useQuery({
    queryKey: ['knowledge-counts'],
    queryFn: () => knowledgeService.counts(),
    staleTime: 10_000,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['knowledge', tab, search],
    queryFn: () =>
      knowledgeService.list({ status: tab, search: search || undefined }),
    staleTime: 5_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['knowledge'] });
    qc.invalidateQueries({ queryKey: ['knowledge-counts'] });
  };

  const validate = useMutation({
    mutationFn: (id: string) => knowledgeService.validate(id),
    onSuccess: () => {
      toast.success('Item validado — já alimenta as respostas');
      invalidate();
    },
    onError: () => toast.error('Erro ao validar'),
  });
  const reject = useMutation({
    mutationFn: (id: string) => knowledgeService.reject(id),
    onSuccess: () => {
      toast.success('Item arquivado');
      invalidate();
    },
    onError: () => toast.error('Erro ao arquivar'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => knowledgeService.remove(id),
    onSuccess: () => {
      toast.success('Item removido');
      invalidate();
    },
    onError: () => toast.error('Erro ao remover'),
  });
  const saveEdit = useMutation({
    mutationFn: (v: { id: string; text: string }) =>
      knowledgeService.update(v.id, { text: v.text }),
    onSuccess: () => {
      toast.success('Item atualizado');
      setEditing(null);
      invalidate();
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-4 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-zinc-500" />
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Central de Conhecimento
          </h1>
          <p className="text-xs text-zinc-500">
            Fatos que alimentam as respostas da IA. Só itens validados entram em
            circulação.
          </p>
        </div>
      </div>

      {/* Abas */}
      <div className="mb-3 flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {TABS.map((t) => {
          const n = counts?.[t.key] ?? 0;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'border-primary text-zinc-900 dark:text-zinc-100'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {t.label}
              {n > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    t.key === 'PENDING'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}
                >
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por texto, anúncio (MLB)…"
        className="mb-3 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      />

      {isLoading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 px-8 py-16 text-center dark:border-zinc-800">
          <BookOpen className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-500">
            {tab === 'PENDING'
              ? 'Nada na fila de validação.'
              : 'Nenhum item aqui.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li
              key={it.id}
              className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  {editing?.id === it.id ? (
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      className="w-full resize-y rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  ) : (
                    <p className="text-sm text-zinc-800 dark:text-zinc-100">
                      {it.text}
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
                    <span className="inline-flex items-center gap-1">
                      {it.itemId ? (
                        <>
                          <Tag className="h-3 w-3" /> Anúncio {it.itemId}
                        </>
                      ) : (
                        <>
                          <Store className="h-3 w-3" /> Toda a loja
                        </>
                      )}
                    </span>
                    <span>{SOURCE_LABEL[it.source] ?? it.source}</span>
                    <span>{new Date(it.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {editing?.id === it.id ? (
                    <>
                      <button
                        onClick={() =>
                          saveEdit.mutate({ id: it.id, text: editText.trim() })
                        }
                        disabled={saveEdit.isPending || !editText.trim()}
                        className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      {it.status === 'PENDING' && (
                        <button
                          title="Validar"
                          onClick={() => validate.mutate(it.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {it.status !== 'ARCHIVED' && (
                        <button
                          title="Arquivar"
                          onClick={() => reject.mutate(it.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-300 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        title="Editar"
                        onClick={() => {
                          setEditing(it);
                          setEditText(it.text);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-300 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        title="Excluir"
                        onClick={() => remove.mutate(it.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-300 text-zinc-500 hover:bg-red-50 hover:text-red-500 dark:border-zinc-700 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
