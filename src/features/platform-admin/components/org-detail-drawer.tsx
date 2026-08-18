'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Ban, Play, ShieldCheck, Loader2 } from 'lucide-react';
import {
  platformAdminService,
  type ImpersonateResult,
} from '../services/platform-admin.service';
import { enterImpersonation } from '../hooks/use-impersonation';
import { Spinner, ErrorBox, fmtDate } from './super-admin-console';

const PLAN_OPTIONS = ['free', 'starter', 'pro', 'business', 'enterprise'];

export function OrgDetailDrawer({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: org, isLoading, error } = useQuery({
    queryKey: ['pa-org', id],
    queryFn: () => platformAdminService.getOrganization(id),
  });

  const [reason, setReason] = useState('');
  const [confirmingSuspend, setConfirmingSuspend] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [impUserId, setImpUserId] = useState<string>('');

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['pa-org', id] });
    void qc.invalidateQueries({ queryKey: ['pa-orgs'] });
    void qc.invalidateQueries({ queryKey: ['pa-overview'] });
  };

  const suspendMut = useMutation({
    mutationFn: (r?: string) => platformAdminService.suspend(id, r),
    onSuccess: () => {
      toast.success('Empresa suspensa');
      setConfirmingSuspend(false);
      setReason('');
      invalidate();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'Falha ao suspender'),
  });

  const reactivateMut = useMutation({
    mutationFn: () => platformAdminService.reactivate(id),
    onSuccess: () => {
      toast.success('Empresa reativada');
      invalidate();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'Falha ao reativar'),
  });

  const planMut = useMutation({
    mutationFn: (p: string) => platformAdminService.updatePlan(id, p),
    onSuccess: () => {
      toast.success('Plano atualizado');
      invalidate();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'Falha ao trocar plano'),
  });

  const impMut = useMutation({
    mutationFn: (userId?: string) =>
      platformAdminService.impersonate(id, userId || undefined),
    onSuccess: (res: ImpersonateResult) => {
      toast.success(`Entrando como ${res.actingAs.name}…`);
      enterImpersonation(res);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'Falha ao impersonar'),
  });

  const currentPlan = plan ?? org?.plan ?? '';
  const planList = org && !PLAN_OPTIONS.includes(org.plan)
    ? [org.plan, ...PLAN_OPTIONS]
    : PLAN_OPTIONS;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-zinc-950 dark:text-white">
              {org?.name ?? 'Empresa'}
            </h2>
            {org && <p className="text-xs text-zinc-500">{org.slug}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="size-5" />
          </button>
        </div>

        {isLoading && <Spinner />}
        {error && (
          <div className="p-4">
            <ErrorBox message={(error as Error).message} />
          </div>
        )}

        {org && (
          <div className="flex flex-col gap-5 p-4">
            {org.status === 'suspended' && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                Suspensa em {fmtDate(org.suspendedAt)}
                {org.suspendedReason ? ` · ${org.suspendedReason}` : ''}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Membros" value={org.counts.members} />
              <Stat label="Canais" value={org.counts.channels} />
              <Stat label="Conversas" value={org.counts.conversations} />
            </div>

            {/* Plano */}
            <section className="flex flex-col gap-2">
              <SectionTitle>Plano</SectionTitle>
              <div className="flex gap-2">
                <select
                  value={currentPlan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                >
                  {planList.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={planMut.isPending || currentPlan === org.plan}
                  onClick={() => planMut.mutate(currentPlan)}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  Salvar
                </button>
              </div>
            </section>

            {/* Impersonação */}
            <section className="flex flex-col gap-2">
              <SectionTitle>Impersonar (agir como)</SectionTitle>
              <div className="flex gap-2">
                <select
                  value={impUserId}
                  onChange={(e) => setImpUserId(e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                >
                  <option value="">Auto (owner/admin)</option>
                  {org.members
                    .filter((m) => m.user.isActive)
                    .map((m) => (
                      <option key={m.userOrganizationId} value={m.user.id}>
                        {m.user.name} ({m.role})
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={impMut.isPending || org.status === 'suspended'}
                  onClick={() => impMut.mutate(impUserId)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {impMut.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="size-4" />
                  )}
                  Entrar
                </button>
              </div>
              {org.status === 'suspended' && (
                <p className="text-xs text-zinc-500">
                  Empresa suspensa — reative antes de impersonar.
                </p>
              )}
            </section>

            {/* Status / suspensão */}
            <section className="flex flex-col gap-2">
              <SectionTitle>Status</SectionTitle>
              {org.status === 'active' ? (
                confirmingSuspend ? (
                  <div className="flex flex-col gap-2 rounded-lg border border-red-200 p-3 dark:border-red-500/30">
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Motivo (opcional)"
                      rows={2}
                      className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={suspendMut.isPending}
                        onClick={() => suspendMut.mutate(reason || undefined)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        <Ban className="size-4" /> Confirmar suspensão
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingSuspend(false)}
                        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingSuspend(true)}
                    className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:hover:bg-red-500/10"
                  >
                    <Ban className="size-4" /> Suspender empresa
                  </button>
                )
              ) : (
                <button
                  type="button"
                  disabled={reactivateMut.isPending}
                  onClick={() => reactivateMut.mutate()}
                  className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Play className="size-4" /> Reativar empresa
                </button>
              )}
            </section>

            {/* Membros */}
            <section className="flex flex-col gap-2">
              <SectionTitle>Membros ({org.members.length})</SectionTitle>
              <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {org.members.map((m) => (
                  <li
                    key={m.userOrganizationId}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-zinc-800 dark:text-zinc-100">
                        {m.user.name}
                      </div>
                      <div className="truncate text-xs text-zinc-500">
                        {m.user.email}
                      </div>
                    </div>
                    <span className="ml-2 shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {m.role}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Canais */}
            <section className="flex flex-col gap-2">
              <SectionTitle>Canais ({org.channels.length})</SectionTitle>
              <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {org.channels.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <span className="truncate text-zinc-800 dark:text-zinc-100">
                      {c.name}
                    </span>
                    <span className="ml-2 shrink-0 text-xs text-zinc-500">
                      {c.type}
                      {c.isActive ? '' : ' · inativo'}
                    </span>
                  </li>
                ))}
                {org.channels.length === 0 && (
                  <li className="px-3 py-2 text-sm text-zinc-500">
                    Nenhum canal.
                  </li>
                )}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 py-2 dark:border-zinc-800">
      <div className="text-lg font-semibold text-zinc-950 dark:text-white">
        {value}
      </div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
      {children}
    </h3>
  );
}
