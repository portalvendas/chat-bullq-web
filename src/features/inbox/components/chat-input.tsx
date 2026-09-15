'use client';

import {
  useState,
  useRef,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Send, Paperclip, Mic, Trash2, Square, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAudioRecorder } from '../hooks/use-audio-recorder';
import { useQuery } from '@tanstack/react-query';
import {
  quickRepliesService,
  renderQuickReplyVars,
  type QuickReply,
  type QuickReplyAttachment,
} from '@/features/quick-replies/services/quick-replies.service';

interface ChatInputProps {
  onSend: (text: string) => Promise<void>;
  onSendAudio?: (blob: Blob) => Promise<void>;
  onSendFile?: (file: File) => Promise<void>;
  disabled?: boolean;
  /** Contexto p/ variáveis das respostas rápidas ({{cliente}}/{{vendedor}}). */
  contactName?: string | null;
  agentName?: string | null;
  /** Envia um anexo (já no storage) de uma resposta rápida, por URL. */
  onSendQuickReplyMedia?: (
    media: QuickReplyAttachment,
    caption?: string,
  ) => Promise<void> | void;
}

// Espelha o whitelist do backend (UploadsService.ALLOWED_MEDIA_MIME) — o
// accept é só UX; a validação real acontece no upload.
const FILE_ACCEPT = [
  'image/*',
  'video/*',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.csv',
  '.zip',
].join(',');

export interface ChatInputHandle {
  applyQuickReply: (reply: QuickReply) => void;
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(
  function ChatInput(
    {
      onSend,
      onSendAudio,
      onSendFile,
      disabled,
      contactName,
      agentName,
      onSendQuickReplyMedia,
    }: ChatInputProps,
    ref,
  ) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSendingAudio, setIsSendingAudio] = useState(false);
  const [isSendingFile, setIsSendingFile] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorder = useAudioRecorder();

  // ── Respostas rápidas ("/") ──────────────────────────────
  const [qrIndex, setQrIndex] = useState(0);
  const [qrDismissed, setQrDismissed] = useState(false);
  const { data: quickReplies = [] } = useQuery({
    queryKey: ['quick-replies'],
    queryFn: () => quickRepliesService.list(),
    staleTime: 60_000,
  });
  const qrQuery = text.startsWith('/') ? text.slice(1).toLowerCase() : null;
  const qrMatches = useMemo(() => {
    if (qrQuery === null || qrDismissed) return [];
    const q = qrQuery.trim();
    return quickReplies
      .filter(
        (r) =>
          q === '' ||
          r.shortcut.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q),
      )
      .sort((a, b) => {
        const as = a.shortcut.toLowerCase().startsWith(q) ? 0 : 1;
        const bs = b.shortcut.toLowerCase().startsWith(q) ? 0 : 1;
        return as - bs;
      });
  }, [qrQuery, qrDismissed, quickReplies]);
  const qrOpen = qrMatches.length > 0;
  const qrActive = qrOpen ? Math.min(qrIndex, qrMatches.length - 1) : 0;

  const applyQuickReply = useCallback(
    (reply: QuickReply) => {
      const rendered = renderQuickReplyVars(reply.content, {
        contactName,
        agentName,
      });
      const atts = reply.attachments ?? [];
      // Com anexo: envia a mídia direto (texto vira legenda do 1º anexo) e
      // limpa o campo. Sem anexo: insere o texto no campo pra editar/enviar.
      if (atts.length > 0 && onSendQuickReplyMedia) {
        setText('');
        setQrDismissed(true);
        setQrIndex(0);
        atts.forEach((a, i) => {
          Promise.resolve(
            onSendQuickReplyMedia(a, i === 0 ? rendered || undefined : undefined),
          ).catch(() => undefined);
        });
        return;
      }
      setText(rendered);
      setQrDismissed(true);
      setQrIndex(0);
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(rendered.length, rendered.length);
          el.style.height = 'auto';
          el.style.height = Math.min(el.scrollHeight, 160) + 'px';
        }
      });
    },
    [contactName, agentName, onSendQuickReplyMedia],
  );

  useImperativeHandle(ref, () => ({ applyQuickReply }), [applyQuickReply]);

  const onChangeText = (v: string) => {
    setText(v);
    if (!v.startsWith('/')) setQrDismissed(false);
    setQrIndex(0);
  };

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    setIsSending(true);
    try {
      await onSend(trimmed);
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setIsSending(false);
    }
  }, [text, isSending, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (qrOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setQrIndex((i) => (i + 1) % qrMatches.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setQrIndex((i) => (i - 1 + qrMatches.length) % qrMatches.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applyQuickReply(qrMatches[qrActive]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setQrDismissed(true);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const handleSendAudio = useCallback(async () => {
    if (!recorder.blob || !onSendAudio) return;
    setIsSendingAudio(true);
    try {
      await onSendAudio(recorder.blob);
      recorder.reset();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Erro ao enviar áudio',
      );
    } finally {
      setIsSendingAudio(false);
    }
  }, [recorder, onSendAudio]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Limpa o value pra permitir reenviar o MESMO arquivo em seguida —
      // sem isso o onChange não dispara na segunda escolha.
      e.target.value = '';
      if (!file || !onSendFile) return;
      setIsSendingFile(true);
      try {
        await onSendFile(file);
      } catch (err: any) {
        toast.error(
          err?.response?.data?.message || err?.message || 'Erro ao enviar arquivo',
        );
      } finally {
        setIsSendingFile(false);
      }
    },
    [onSendFile],
  );

  const formatElapsed = (ms: number) => {
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (disabled) {
    return (
      <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-3 text-center text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50">
        Conversa encerrada — reabra para enviar mensagens
      </div>
    );
  }

  // RECORDING MODE: shows a big bar with a pulsing red dot and the timer.
  if (recorder.state === 'recording') {
    return (
      <div className="border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900/40 dark:bg-red-500/10">
          <button
            onClick={recorder.cancel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20"
            aria-label="Cancelar gravação"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <div className="flex flex-1 items-center gap-2 text-sm text-red-700 dark:text-red-300">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <span className="font-medium tabular-nums">{formatElapsed(recorder.elapsedMs)}</span>
            <span className="text-xs opacity-70">Gravando…</span>
          </div>
          <button
            onClick={recorder.stop}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500 text-white hover:bg-red-600"
            aria-label="Parar gravação"
          >
            <Square className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // PREVIEW MODE: the recording finished, user can listen/discard/send.
  if (recorder.state === 'stopped' && recorder.blob) {
    const audioSrc = URL.createObjectURL(recorder.blob);
    return (
      <div className="border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900">
          <button
            onClick={recorder.cancel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800"
            aria-label="Descartar áudio"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <audio
            controls
            src={audioSrc}
            className="h-9 flex-1 min-w-0"
          />
          <button
            onClick={handleSendAudio}
            disabled={isSendingAudio}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            aria-label="Enviar áudio"
          >
            {isSendingAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar
          </button>
        </div>
        {recorder.error && (
          <p className="mt-1 text-xs text-red-500">{recorder.error}</p>
        )}
      </div>
    );
  }

  // IDLE MODE: text input + mic button.
  const canRecord = !!onSendAudio;
  const showMic = canRecord && !text.trim();

  return (
    <div className="relative border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      {qrOpen && (
        <div className="absolute bottom-full left-3 right-3 z-30 mb-2 max-h-64 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Respostas rápidas
          </div>
          {qrMatches.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                applyQuickReply(r);
              }}
              onMouseEnter={() => setQrIndex(i)}
              className={`flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left ${
                i === qrActive
                  ? 'bg-primary/10'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <code className="mt-0.5 shrink-0 rounded bg-zinc-100 px-1 text-[11px] font-medium text-primary dark:bg-zinc-800">
                /{r.shortcut}
              </code>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 truncate text-xs font-medium text-zinc-800 dark:text-zinc-100">
                  {r.title}
                  {r.attachments && r.attachments.length > 0 && (
                    <Paperclip className="h-3 w-3 shrink-0 text-zinc-400" />
                  )}
                </span>
                <span className="block truncate text-[11px] text-zinc-500">
                  {r.content || (r.attachments?.length ? 'Anexo' : '')}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={FILE_ACCEPT}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!onSendFile || isSendingFile}
          className="mb-1 rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-zinc-800"
          aria-label="Anexar arquivo"
        >
          {isSendingFile ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Paperclip className="h-5 w-5" />
          )}
        </button>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => onChangeText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Digite uma mensagem..."
          rows={1}
          className="max-h-40 min-h-[40px] flex-1 resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        {showMic ? (
          <button
            onClick={recorder.start}
            type="button"
            className="mb-1 rounded-lg bg-zinc-100 p-2.5 text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            aria-label="Gravar áudio"
          >
            <Mic className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || isSending}
            className="mb-1 rounded-lg bg-primary p-2.5 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            aria-label="Enviar mensagem"
          >
            {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        )}
      </div>
      {recorder.error && (
        <p className="mt-1.5 text-xs text-red-500">{recorder.error}</p>
      )}
    </div>
  );
});
