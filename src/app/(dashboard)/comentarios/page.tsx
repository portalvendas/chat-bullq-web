'use client';

import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  MessageCircle,
  Send,
  Reply,
  UserPlus,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Megaphone,
} from 'lucide-react';
import {
  instagramCommentsService,
  type IgComment,
} from '@/features/instagram-comments/services';

function timeAgo(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadges({ c }: { c: IgComment }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {c.dmSent && (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
          <CheckCircle2 className="h-3 w-3" /> DM enviada
        </span>
      )}
      {c.repliedPublic && (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
          <CheckCircle2 className="h-3 w-3" /> Respondido
        </span>
      )}
      {c.convertedCardId && (
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
          <CheckCircle2 className="h-3 w-3" /> Lead
        </span>
      )}
      {c.adId && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
          <Megaphone className="h-3 w-3" /> Anúncio
        </span>
      )}
    </div>
  );
}

function CommentCard({
  c,
  onChanged,
}: {
  c: IgComment;
  onChanged: () => void;
}) {
  const [publicOpen, setPublicOpen] = useState(false);
  const [publicText, setPublicText] = useState('');

  const replyPublic = useMutation({
    mutationFn: (text: string) => instagramCommentsService.replyPublic(c.id, text),
    onSuccess: () => {
      toast.success('Resposta pública enviada');
      setPublicOpen(false);
      setPublicText('');
      onChanged();
    },
    onError: (e: any) => toast.error(e?.message ?? 'Falha ao responder'),
  });
  const replyDm = useMutation({
    mutationFn: () => instagramCommentsService.replyDm(c.id),
    onSuccess: () => {
      toast.success('DM enviada');
      onChanged();
    },
    onError: (e: any) => toast.error(e?.message ?? 'Falha ao enviar DM'),
  });
  const convert = useMutation({
    mutationFn: () => instagramCommentsService.convertLead(c.id),
    onSuccess: () => {
      toast.success('Comentário convertido em lead');
      onChanged();
    },
    onError: (e: any) => toast.error(e?.message ?? 'Falha ao converter'),
  });

  const busy = replyPublic.isPending || replyDm.isPending || convert.isPending;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              @{c.fromUsername || c.fromExternalId}
            </span>
            <span className="text-[11px] text-zinc-400">{timeAgo(c.createdAt)}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
            {c.text || <span className="italic text-zinc-400">(sem texto)</span>}
          </p>
        </div>
        <StatusBadges c={c} />
      </div>

      {/* Preview do post/anúncio comentado */}
      {(c.mediaUrl || c.mediaCaption || c.mediaPermalink) && (
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-zinc-50 p-2.5 dark:bg-zinc-800/50">
          {c.mediaUrl && c.mediaType !== 'VIDEO' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.mediaUrl}
              alt=""
              className="h-14 w-14 shrink-0 rounded-md object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-zinc-200 text-zinc-400 dark:bg-zinc-700">
              <MessageCircle className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
              {c.mediaCaption || 'Publicação do Instagram'}
            </p>
            {c.mediaPermalink && (
              <a
                href={c.mediaPermalink}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Ver post original
              </a>
            )}
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => setPublicOpen((v) => !v)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <Reply className="h-3.5 w-3.5" /> Responder no post
        </button>
        <button
          onClick={() => replyDm.mutate()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {replyDm.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Enviar DM
        </button>
        <button
          onClick={() => convert.mutate()}
          disabled={busy || !!c.convertedCardId}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {convert.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <UserPlus className="h-3.5 w-3.5" />
          )}
          {c.convertedCardId ? 'Já é lead' : 'Converter em lead'}
        </button>
      </div>

      {publicOpen && (
        <div className="mt-2 flex items-start gap-2">
          <textarea
            value={publicText}
            onChange={(e) => setPublicText(e.target.value)}
            rows={2}
            placeholder="Resposta pública no comentário…"
            className="flex-1 resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-800"
          />
          <button
            onClick={() => publicText.trim() && replyPublic.mutate(publicText.trim())}
            disabled={!publicText.trim() || replyPublic.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {replyPublic.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Enviar
          </button>
        </div>
      )}
    </div>
  );
}

export default function ComentariosPage() {
  const qc = useQueryClient();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['ig-comments'],
    queryFn: ({ pageParam }) =>
      instagramCommentsService.list({ cursor: pageParam as string | undefined, limit: 30 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const comments = data?.pages.flatMap((p) => p.data) ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ['ig-comments'] });

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-zinc-500" />
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Comentários do Instagram
          </h1>
          <p className="text-xs text-zinc-500">
            Comentários em posts e anúncios — fora do inbox. A auto-DM já foi
            disparada; aqui você responde, chama no direct ou converte em lead.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-zinc-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando comentários…
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 py-16 text-center text-sm text-zinc-400 dark:border-zinc-800">
          Nenhum comentário ainda. Quando alguém comentar num post/anúncio da
          conta, ele aparece aqui.
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <CommentCard key={c.id} c={c} onChanged={invalidate} />
          ))}
          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />}
                Carregar mais
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
