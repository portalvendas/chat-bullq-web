'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dropdown,
  DropdownButton,
  DropdownMenu,
  DropdownItem,
  DropdownDivider,
} from '@/components/ui/dropdown';
import { getSocket } from '@/lib/socket';
import {
  notificationsSettingsService,
  type Notification,
} from '@/features/settings/services/notifications.service';

/** Evento emitido pelo backend (notification.processor → emitToUser). */
interface IncomingNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  createdAt?: string;
}

/** Beep curto via WebAudio — sem precisar de arquivo de áudio. */
function playBeep() {
  try {
    if (localStorage.getItem('notif.sound') === '0') return; // silenciado
    const Ctx =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => ctx.close();
  } catch {
    /* autoplay bloqueado antes da 1ª interação — ignora */
  }
}

/** Rota de destino ao clicar numa notificação, conforme os dados. */
function hrefFor(data?: Record<string, any>): string {
  if (!data) return '/inbox';
  // Qualquer notificação com conversa (nova msg, conversa presa/SLA, transfer…)
  // abre direto a conversa.
  if (data.conversationId) {
    return `/inbox?conversationId=${data.conversationId}`;
  }
  if (data.kind === 'card_inactive') {
    return data.pipelineId ? `/pipelines/${data.pipelineId}` : '/pipelines';
  }
  return '/inbox';
}

/**
 * Tipos que exigem AÇÃO (a resolver) — sobem no topo e ganham selo.
 * SLA_BREACH = "conversa presa"; CARD_INACTIVE = card parado; etc.
 */
const RESOLVE_TYPES = new Set([
  'SLA_BREACH',
  'SLA_WARNING',
  'CARD_INACTIVE',
  'AI_TOOL_FAILURE',
  'MENTION',
]);
const TYPE_PRIORITY: Record<string, number> = {
  SLA_BREACH: 0,
  CARD_INACTIVE: 1,
  SLA_WARNING: 1,
  AI_TOOL_FAILURE: 2,
  MENTION: 2,
};

/** Ordena: não lidas primeiro, depois tipo prioritário, depois recência. */
function prioritize(items: Notification[]): Notification[] {
  return [...items].sort((a, b) => {
    const ua = a.isRead ? 1 : 0;
    const ub = b.isRead ? 1 : 0;
    if (ua !== ub) return ua - ub;
    const pa = TYPE_PRIORITY[a.type] ?? 5;
    const pb = TYPE_PRIORITY[b.type] ?? 5;
    if (pa !== pb) return pa - pb;
    return (
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });
}

export function NotificationsBell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);

  const { data } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => notificationsSettingsService.list(1, 15),
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  // Semeia estado local a partir do servidor.
  useEffect(() => {
    if (!data) return;
    setItems(data.notifications);
    setUnread(data.unreadCount);
  }, [data]);

  // Realtime: escuta o socket e reage a cada notificação nova.
  useEffect(() => {
    const socket = getSocket();
    const onNew = (n: IncomingNotification) => {
      setUnread((c) => c + 1);
      setItems((prev) => [
        {
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          data: n.data ?? {},
          isRead: false,
          readAt: null,
          createdAt: n.createdAt ?? new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 30));
      playBeep();
      toast(n.title, {
        description: n.body,
        action: {
          label: 'Abrir',
          onClick: () => router.push(hrefFor(n.data)),
        },
      });
      // Mantém a query de contagem em sincronia com o resto do app.
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };
    socket.on('notification:new', onNew);
    return () => {
      socket.off('notification:new', onNew);
    };
  }, [router, queryClient]);

  const handleOpen = useCallback(
    (n: Notification) => {
      if (!n.isRead) {
        notificationsSettingsService.markRead(n.id).catch(() => {});
        setUnread((c) => Math.max(0, c - 1));
        setItems((prev) =>
          prev.map((it) => (it.id === n.id ? { ...it, isRead: true } : it)),
        );
      }
      router.push(hrefFor(n.data));
    },
    [router],
  );

  const markAll = useCallback(() => {
    notificationsSettingsService.markAllRead().catch(() => {});
    setUnread(0);
    setItems((prev) => prev.map((it) => ({ ...it, isRead: true })));
  }, []);

  return (
    <Dropdown>
      <DropdownButton
        aria-label="Notificações"
        className="relative flex items-center justify-center rounded-lg p-1.5 text-zinc-500 transition-colors hover:text-zinc-950 focus:outline-none dark:text-zinc-400 dark:hover:text-white"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </DropdownButton>

      <DropdownMenu anchor="bottom end" className="w-80 max-w-[92vw]">
        <div className="flex items-center justify-between px-2.5 py-1.5">
          <span className="text-sm font-semibold text-zinc-950 dark:text-white">
            Notificações
          </span>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAll}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
            >
              <CheckCheck className="size-3.5" /> Marcar todas
            </button>
          )}
        </div>
        <DropdownDivider />

        {items.length === 0 ? (
          <div className="px-2.5 py-6 text-center text-sm text-zinc-400">
            Nenhuma notificação
          </div>
        ) : (
          prioritize(items)
            .slice(0, 15)
            .map((n) => {
              const resolver = RESOLVE_TYPES.has(n.type) && !n.isRead;
              return (
                <DropdownItem
                  key={n.id}
                  onClick={() => handleOpen(n)}
                  className="flex-col items-start gap-0.5"
                >
                  <div className="flex w-full items-center gap-2">
                    {!n.isRead && (
                      <span
                        className={`size-2 shrink-0 rounded-full ${
                          resolver ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                      />
                    )}
                    <span className="truncate text-sm font-medium">{n.title}</span>
                    {resolver && (
                      <span className="ml-auto shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Resolver
                      </span>
                    )}
                  </div>
                  <span className="line-clamp-2 w-full text-xs text-zinc-500 dark:text-zinc-400">
                    {n.body}
                  </span>
                </DropdownItem>
              );
            })
        )}
      </DropdownMenu>
    </Dropdown>
  );
}
