'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Building2,
  Users,
  MessageSquare,
  Radio,
  Search,
  Loader2,
  Plus,
  X,
} from 'lucide-react';
import {
  platformAdminService,
  type OrgListItem,
  type PlatformUserItem,
  type AuditLogItem,
} from '../services/platform-admin.service';
import { useDebounced } from '../hooks/use-debounced';
import { useCursorList } from '../hooks/use-cursor-list';
import { OrgDetailDrawer } from './org-detail-drawer';

type Tab = 'overview' | 'orgs' | 'users' | 'audit';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Visão geral' },
  { key: 'orgs', label: 'Empresas' },
  { key: 'users', label: 'Usuários' },
  { key: 'audit', label: 'Auditoria' },
];

function fmtDate(v: string | null): string {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
}

function fmtDateTime(v: string | null): string {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function SuperAdminConsole() {
  const [tab, setTab] = useState<Tab>('overview');
  const [openOrgId, setOpenOrgId] = useState<string | null>(null);

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-5 overflow-y-auto p-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-white">
          Super Admin
        </h1>
        <p className="text-sm text-zinc-500">
          Console da plataforma multiempresa
        </p>
      </header>

      <nav className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              'border-b-2 px-4 py-2 text-sm font-medium transition ' +
              (tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200')
            }
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'orgs' && <OrgsTab onOpen={setOpenOrgId} />}
      {tab === 'users' && <UsersTab />}
      {tab === 'audit' && <AuditTab />}

      {openOrgId && (
        <OrgDetailDrawer id={openOrgId} onClose={() => setOpenOrgId(null)} />
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 text-zinc-500">
        <Icon className="size-4" />
        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-white">
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}

function OverviewTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['pa-overview'],
    queryFn: () => platformAdminService.overview(),
  });

  if (isLoading) return <Spinner />;
  if (error)
    return <ErrorBox message={(error as Error).message} />;
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        icon={Building2}
        label="Empresas"
        value={data.organizations.total}
        hint={`${data.organizations.active} ativas · ${data.organizations.suspended} suspensas`}
      />
      <MetricCard
        icon={Users}
        label="Usuários"
        value={data.users.total}
        hint={`${data.users.active} ativos`}
      />
      <MetricCard icon={Radio} label="Canais" value={data.channels.total} />
      <MetricCard
        icon={MessageSquare}
        label="Conversas"
        value={data.conversations.total}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: 'active' | 'suspended' }) {
  return (
    <span
      className={
        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ' +
        (status === 'active'
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
          : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400')
      }
    >
      {status === 'active' ? 'ativa' : 'suspensa'}
    </span>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
      />
    </div>
  );
}

function OrgsTab({ onOpen }: { onOpen: (id: string) => void }) {
  const [raw, setRaw] = useState('');
  const search = useDebounced(raw, 350);
  const [showNew, setShowNew] = useState(false);
  const { items, nextCursor, loading, error, loadMore, reload } =
    useCursorList<OrgListItem>(platformAdminService.listOrganizations, search);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SearchBox
            value={raw}
            onChange={setRaw}
            placeholder="Buscar por nome ou slug…"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus className="size-4" /> Nova empresa
        </button>
      </div>
      {showNew && (
        <NewOrgModal onClose={() => setShowNew(false)} onCreated={reload} />
      )}
      {error && <ErrorBox message={error} />}
      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-2 font-medium">Empresa</th>
              <th className="px-4 py-2 font-medium">Plano</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Membros</th>
              <th className="px-4 py-2 font-medium">Canais</th>
              <th className="px-4 py-2 font-medium">Criada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map((o) => (
              <tr
                key={o.id}
                onClick={() => onOpen(o.id)}
                className="cursor-pointer bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900"
              >
                <td className="px-4 py-2.5">
                  <div className="font-medium text-zinc-900 dark:text-white">
                    {o.name}
                  </div>
                  <div className="text-xs text-zinc-500">{o.slug}</div>
                </td>
                <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-300">
                  {o.plan}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={o.status} />
                </td>
                <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-300">
                  {o.counts.members}
                </td>
                <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-300">
                  {o.counts.channels}
                </td>
                <td className="px-4 py-2.5 text-zinc-500">
                  {fmtDate(o.createdAt)}
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  Nenhuma empresa encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <ListFooter loading={loading} hasMore={!!nextCursor} onMore={loadMore} />
    </div>
  );
}

function UsersTab() {
  const [raw, setRaw] = useState('');
  const search = useDebounced(raw, 350);
  const { items, nextCursor, loading, error, loadMore } =
    useCursorList<PlatformUserItem>(platformAdminService.listUsers, search);

  return (
    <div className="flex flex-col gap-3">
      <SearchBox value={raw} onChange={setRaw} placeholder="Buscar por nome ou e-mail…" />
      {error && <ErrorBox message={error} />}
      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-2 font-medium">Usuário</th>
              <th className="px-4 py-2 font-medium">Empresas</th>
              <th className="px-4 py-2 font-medium">Papel plataforma</th>
              <th className="px-4 py-2 font-medium">Ativo</th>
              <th className="px-4 py-2 font-medium">Criado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map((u) => (
              <tr key={u.id} className="bg-white dark:bg-zinc-950">
                <td className="px-4 py-2.5">
                  <div className="font-medium text-zinc-900 dark:text-white">
                    {u.name}
                  </div>
                  <div className="text-xs text-zinc-500">{u.email}</div>
                </td>
                <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-300">
                  {u.organizations.map((o) => o.name).join(', ') || '—'}
                </td>
                <td className="px-4 py-2.5">
                  {u.platformRole ? (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                      {u.platformRole}
                    </span>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {u.isActive ? (
                    <span className="text-emerald-600">sim</span>
                  ) : (
                    <span className="text-red-500">não</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-zinc-500">
                  {fmtDate(u.createdAt)}
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <ListFooter loading={loading} hasMore={!!nextCursor} onMore={loadMore} />
    </div>
  );
}

function AuditTab() {
  const { items, nextCursor, loading, error, loadMore } =
    useCursorList<AuditLogItem>(platformAdminService.listAuditLogs, '');

  return (
    <div className="flex flex-col gap-3">
      {error && <ErrorBox message={error} />}
      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-2 font-medium">Quando</th>
              <th className="px-4 py-2 font-medium">Ator</th>
              <th className="px-4 py-2 font-medium">Ação</th>
              <th className="px-4 py-2 font-medium">Alvo</th>
              <th className="px-4 py-2 font-medium">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map((a) => (
              <tr key={a.id} className="bg-white dark:bg-zinc-950">
                <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500">
                  {fmtDateTime(a.createdAt)}
                </td>
                <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-200">
                  {a.actor?.email ?? '—'}
                </td>
                <td className="px-4 py-2.5">
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    {a.action}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-zinc-500">
                  {a.targetType}
                  {a.targetId ? `:${a.targetId.slice(0, 8)}` : ''}
                </td>
                <td className="px-4 py-2.5 text-zinc-500">{a.ipAddress ?? '—'}</td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  Sem registros de auditoria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <ListFooter loading={loading} hasMore={!!nextCursor} onMore={loadMore} />
    </div>
  );
}

function ListFooter({
  loading,
  hasMore,
  onMore,
}: {
  loading: boolean;
  hasMore: boolean;
  onMore: () => void;
}) {
  if (loading) return <Spinner />;
  if (!hasMore) return null;
  return (
    <button
      type="button"
      onClick={onMore}
      className="mx-auto rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
    >
      Carregar mais
    </button>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-8 text-zinc-400">
      <Loader2 className="size-5 animate-spin" />
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
      {message}
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-white';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
        {label}
      </span>
      {children}
    </label>
  );
}

function NewOrgModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [plan, setPlan] = useState('');
  const [result, setResult] = useState<{
    inviteToken: string;
    emailSent: boolean;
  } | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      platformAdminService.createOrganization({
        name: name.trim(),
        ownerEmail: ownerEmail.trim(),
        plan: plan.trim() || undefined,
      }),
    onSuccess: (r) => {
      setResult({ inviteToken: r.inviteToken, emailSent: r.emailSent });
      onCreated();
      toast.success('Empresa criada');
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'Falha ao criar empresa'),
  });

  const inviteLink = result
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/register?invite=${result.inviteToken}`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
            Nova empresa
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="size-5" />
          </button>
        </div>

        {result ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Empresa criada.{' '}
              {result.emailSent
                ? 'Convite enviado por e-mail ao dono.'
                : 'E-mail não configurado — envie o link abaixo ao dono manualmente.'}
            </p>
            <div className="rounded-lg border border-zinc-200 p-2 dark:border-zinc-800">
              <div className="mb-1 text-xs text-zinc-500">
                Link do convite (OWNER)
              </div>
              <div className="break-all text-xs text-zinc-800 dark:text-zinc-200">
                {inviteLink}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(inviteLink);
                  toast.success('Link copiado');
                }}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:text-zinc-200"
              >
                Copiar link
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
              >
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Field label="Nome da empresa">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                placeholder="Acme Ltda"
              />
            </Field>
            <Field label="E-mail do dono (OWNER)">
              <input
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                type="email"
                className={inputCls}
                placeholder="dono@empresa.com"
              />
            </Field>
            <Field label="Plano (opcional)">
              <input
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className={inputCls}
                placeholder="free"
              />
            </Field>
            <button
              type="button"
              disabled={mut.isPending || !name.trim() || !ownerEmail.trim()}
              onClick={() => mut.mutate()}
              className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {mut.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Criar empresa
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export { fmtDate, fmtDateTime };
