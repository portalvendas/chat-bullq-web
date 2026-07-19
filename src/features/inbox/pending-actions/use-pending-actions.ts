'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  approvePendingAction,
  listPendingActions,
  rejectPendingAction,
  pendingActionsService,
} from './api';
import type { PendingAction } from './types';

const PENDING_ACTIONS_KEY = 'pending-actions';

export const pendingActionsQueryKey = (conversationId: string) =>
  [PENDING_ACTIONS_KEY, conversationId] as const;

/**
 * Lists pending actions for a conversation. Auto-refetches every 10s so
 * an approver sees newly-created actions without manual refresh, and
 * also re-runs on focus/reconnect (matches the inbox's pattern of
 * recovering from missed socket events).
 */
export function usePendingActions(conversationId: string | undefined) {
  return useQuery<PendingAction[]>({
    queryKey: pendingActionsQueryKey(conversationId ?? ''),
    queryFn: () => listPendingActions(conversationId as string),
    enabled: Boolean(conversationId),
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 5_000,
  });
}

interface MutationContext {
  conversationId: string;
}

/**
 * Approves the action and forces a refetch of the conversation's list.
 * The caller passes `conversationId` so we can invalidate the right
 * query without needing to re-fetch the action's detail first.
 */
export function useApprovePendingAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text?: string } & MutationContext) =>
      approvePendingAction(id, text),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: pendingActionsQueryKey(variables.conversationId),
      });
    },
  });
}

export function useRejectPendingAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      reason,
    }: { id: string; reason: string } & MutationContext) =>
      rejectPendingAction(id, reason),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: pendingActionsQueryKey(variables.conversationId),
      });
    },
  });
}

/**
 * Regenera a resposta com uma informação complementar do operador. Ao
 * concluir, invalida a lista — a ação antiga (expirada no backend) some e a
 * nova aparece após o re-run do agente.
 */
export function useRegenerateAnswer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      conversationId,
      complement,
      scope,
    }: { complement: string; scope?: 'item' | 'store' } & MutationContext) =>
      pendingActionsService.regenerate(conversationId, complement, scope),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: pendingActionsQueryKey(variables.conversationId),
      });
    },
  });
}
