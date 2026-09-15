'use client';

import { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  MessageSquareText,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  X,
  Building2,
  User as UserIcon,
  Paperclip,
  Image as ImageIcon,
  Video as VideoIcon,
  Music,
  FileText,
} from 'lucide-react';
import {
  quickRepliesService,
  type QuickReply,
  type QuickReplyScope,
  type QuickReplyAttachment,
} from '@/features/quick-replies/services/quick-replies.service';

interface Draft {
  id?: string;
  shortcut: string;
  title: string;
  content: string;
  scope: QuickReplyScope;
  attachments: QuickReplyAttachment[];
}

const EMPTY: Draft = {
  shortcut: '',
  title: '',
  content: '',
  scope: 'ORG',
  attachments: [],
};

function AttIcon({ type }: { type: QuickReplyAttachment['type'] }) {
  const cls = 'h-3.5 w-3.5';
  if (type === 'IMAGE') return <ImageIcon className={cls} />;
  if (type === 'VIDEO') return <VideoIcon className={cls} />;
  if (type === 'AUDIO') return <Music className={cls} />;
  return <FileText className={cls} />;
}

// Variáveis disponíveis no conteúdo (resolvidas no envio).
const VARS: { token: string; label: string; hint: string }[] = [
  { token: '{{cliente}}', label: 'Cliente', hint: 'Primeiro nome do contato' },
  { token: '{{vendedor}}', label: 'Vendedor', hint: 'Primeiro nome do atendente' },
];

export default function QuickRepliesPage() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['quick-replies'],
    queryFn: () => quickRepliesService.list(),
    staleTime: 30_000,
  });

  const [draft, setDraft] = useState<Draft | null>(null);
  const invalidate = () => qc.invalidateQueries({ queryKey: ['quick-replies'] });
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Insere a variável na posição do cursor do textarea de conteúdo.
  const insertVar = (token: string) => {
    if (!draft) return;
    const el = contentRef.current;
    const cur = draft.content;
    const start = el?.selectionStart ?? cur.length;
    const end = el?.selectionEnd ?? cur.length;
    const next = cur.slice(0, start) + token + cur.slice(end);
    setDraft({ ...draft, content: next });
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const onPickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: QuickReplyAttachment[] = [];
      for (const f of Array.from(files)) {
        uploaded.push(await quickRepliesService.uploadAttachment(f));
      }
      setDraft((d) =>
        d ? { ...d, attachments: [...d.attachments, ...uploaded] } : d,
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Erro ao subir o anexo';
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeAtt = (idx: number) =>
    setDraft((d) =>
      d ? { ...d, attachments: d.attachments.filter((_, i) => i !== idx) } : d,
    );

  const save = useMutation({
    mutationFn: (d: Draft) => {
      const shortcut = d.shortcut.trim().replace(/^\/+/, '').toLowerCase();
      const payload = {
        shortcut,
        title: d.title.trim(),
        content: d.content,
        attachments: d.attachments,
        scope: d.scope,
      };
      return d.id
        ? quickRepliesService.update(d.id, payload)
        : quickRepliesService.create(payload);
    },
    onSuccess: () => {
      toast.success('Resposta rápida salva');
      setDraft(null);
      invalidate();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Erro ao salvar';
      toast.error(msg);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => quickRepliesService.remove(id),
    onSuccess: () => {
      toast.success('Resposta removida');
      invalidate();
    },
    onError: () => toast.error('Erro ao remover'),
  });

  const orgItems = useMemo(() => items.filter((i) => !i.userId), [items]);
  const personalItems = useMemo(() => items.filter((i) => i.userId), [items]);

  const canSave =
    !!draft &&
    draft.shortcut.trim().length > 0 &&
    draft.title.trim().length > 0 &&
    (draft.content.trim().length > 0 || draft.attachments.length > 0);

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquareText className="h-5 w-5 text-zinc-500" />
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Respostas rápidas
          </h2>
          <p className="text-xs text-zinc-500">
            No chat, digite <b>/</b> para abrir a lista e escolher uma resposta.
            O conteúdo aceita <b>{'{{cliente}}'}</b> e <b>{'{{vendedor}}'}</b>,
            que viram o primeiro nome do contato e do atendente no envio.
          </p>
        </div>
      </div>

      {draft === null ? (
        <button
          onClick={() => setDraft({ ...EMPTY })}
          className="mb-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Nova resposta
        </button>
      ) : (
        <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {draft.id ? 'Editar resposta' : 'Nova resposta'}
            </p>
            <button
              onClick={() => setDraft(null)}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Atalho (depois da /)
              </label>
              <div className="flex items-center rounded-md border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-800">
                <span className="pl-2 text-sm text-zinc-400">/</span>
                <input
                  value={draft.shortcut}
                  onChange={(e) =>
                    setDraft({ ...draft, shortcut: e.target.value })
                  }
                  placeholder="ola"
                  className="w-full rounded-md bg-transparent px-1.5 py-2 text-sm outline-none dark:text-zinc-100"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Escopo
              </label>
              <select
                value={draft.scope}
                onChange={(e) =>
                  setDraft({ ...draft, scope: e.target.value as QuickReplyScope })
                }
                className="w-full rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="ORG">Empresa (todos veem)</option>
                <option value="PERSONAL">Pessoal (só eu)</option>
              </select>
            </div>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Título
            </label>
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Saudação inicial"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Conteúdo
            </label>
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-zinc-400">Inserir variável:</span>
              {VARS.map((v) => (
                <button
                  key={v.token}
                  type="button"
                  onClick={() => insertVar(v.token)}
                  title={v.hint}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10"
                >
                  <span className="opacity-60">{v.label}:</span>
                  <code>{v.token}</code>
                </button>
              ))}
            </div>
            <textarea
              ref={contentRef}
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              rows={4}
              placeholder={'Oi {{cliente}}! Aqui é {{vendedor}}, da Armazém Decora. Como posso te ajudar?'}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <p className="mt-1 text-[11px] text-zinc-400">
              As variáveis são trocadas pelo nome real no momento do envio.
            </p>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Anexos (imagem, vídeo, áudio, documento)
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
              multiple
              hidden
              onChange={(e) => onPickFiles(e.target.files)}
            />
            <div className="flex flex-wrap items-center gap-2">
              {draft.attachments.map((a, i) => (
                <span
                  key={i}
                  className="inline-flex max-w-[220px] items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  <AttIcon type={a.type} />
                  <span className="truncate">{a.fileName || a.type}</span>
                  <button
                    type="button"
                    onClick={() => removeAtt(i)}
                    className="rounded p-0.5 text-zinc-400 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-zinc-300 px-2.5 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Paperclip className="h-3.5 w-3.5" />
                )}
                Anexar
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => draft && save.mutate(draft)}
              disabled={!canSave || save.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Salvar
            </button>
            <button
              onClick={() => setDraft(null)}
              className="rounded-md px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-400 dark:border-zinc-700">
          Nenhuma resposta rápida ainda. Crie a primeira acima.
        </p>
      ) : (
        <div className="space-y-5">
          {[
            { key: 'org', label: 'Da empresa', rows: orgItems, Icon: Building2 },
            { key: 'me', label: 'Minhas', rows: personalItems, Icon: UserIcon },
          ]
            .filter((g) => g.rows.length > 0)
            .map((g) => (
              <div key={g.key}>
                <div className="mb-1.5 flex items-center gap-1.5 px-0.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                  <g.Icon className="h-3 w-3" /> {g.label}
                </div>
                <div className="space-y-1.5">
                  {g.rows.map((r: QuickReply) => (
                    <div
                      key={r.id}
                      className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <code className="mt-0.5 shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[12px] font-medium text-primary dark:bg-zinc-800">
                        /{r.shortcut}
                      </code>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {r.title}
                        </div>
                        <div className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-xs text-zinc-500">
                          {r.content}
                        </div>
                        {r.attachments && r.attachments.length > 0 && (
                          <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-zinc-400">
                            <Paperclip className="h-3 w-3" />
                            {r.attachments.length} anexo(s)
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() =>
                            setDraft({
                              id: r.id,
                              shortcut: r.shortcut,
                              title: r.title,
                              content: r.content,
                              scope: r.userId ? 'PERSONAL' : 'ORG',
                              attachments: r.attachments ?? [],
                            })
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            confirm(`Remover "${r.title}"?`) && remove.mutate(r.id)
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                          title="Remover"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
