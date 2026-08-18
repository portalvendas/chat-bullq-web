import { api } from '@/lib/api';

/** Backend embrulha respostas em { data }. Aceita cru também. */
function unwrap<T>(data: any): T {
  return (data?.data ?? data) as T;
}

export interface PlatformOverview {
  organizations: { total: number; active: number; suspended: number };
  users: { total: number; active: number };
  channels: { total: number };
  conversations: { total: number };
}

export interface OrgCounts {
  members: number;
  channels: number;
  conversations: number;
}

export interface OrgListItem {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: 'active' | 'suspended';
  suspendedAt: string | null;
  createdAt: string;
  counts: OrgCounts;
}

export interface OrgMember {
  userOrganizationId: string;
  role: string;
  joinedAt: string;
  user: { id: string; name: string; email: string; isActive: boolean };
}

export interface OrgChannel {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  createdAt: string;
}

export interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: 'active' | 'suspended';
  suspendedAt: string | null;
  suspendedReason: string | null;
  createdAt: string;
  updatedAt: string;
  counts: OrgCounts;
  members: OrgMember[];
  channels: OrgChannel[];
}

export interface PlatformUserItem {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  platformRole: string | null;
  createdAt: string;
  organizations: { role: string; id: string; name: string; slug: string }[];
}

export interface AuditLogItem {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  organizationId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  actor: { id: string; name: string; email: string } | null;
}

export interface ImpersonateResult {
  token: string;
  tokenType: string;
  expiresIn: string;
  organization: { id: string; name: string };
  actingAs: { id: string; name: string; email: string; role: string };
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export type ListParams = {
  cursor?: string;
  limit?: number;
  search?: string;
};

function qs(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v) !== '') p.set(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const platformAdminService = {
  async overview(): Promise<PlatformOverview> {
    const { data } = await api.get('/platform-admin/overview');
    return unwrap<PlatformOverview>(data);
  },

  async listOrganizations(
    params: ListParams = {},
  ): Promise<Paginated<OrgListItem>> {
    const { data } = await api.get(`/platform-admin/organizations${qs(params)}`);
    return unwrap<Paginated<OrgListItem>>(data);
  },

  async getOrganization(id: string): Promise<OrgDetail> {
    const { data } = await api.get(`/platform-admin/organizations/${id}`);
    return unwrap<OrgDetail>(data);
  },

  async suspend(id: string, reason?: string): Promise<void> {
    await api.patch(`/platform-admin/organizations/${id}/suspend`, { reason });
  },

  async reactivate(id: string): Promise<void> {
    await api.patch(`/platform-admin/organizations/${id}/reactivate`, {});
  },

  async updatePlan(id: string, plan: string): Promise<void> {
    await api.patch(`/platform-admin/organizations/${id}/plan`, { plan });
  },

  async listUsers(params: ListParams = {}): Promise<Paginated<PlatformUserItem>> {
    const { data } = await api.get(`/platform-admin/users${qs(params)}`);
    return unwrap<Paginated<PlatformUserItem>>(data);
  },

  async listAuditLogs(
    params: ListParams & { organizationId?: string } = {},
  ): Promise<Paginated<AuditLogItem>> {
    const { data } = await api.get(`/platform-admin/audit-logs${qs(params)}`);
    return unwrap<Paginated<AuditLogItem>>(data);
  },

  async impersonate(
    organizationId: string,
    userId?: string,
  ): Promise<ImpersonateResult> {
    const { data } = await api.post(
      `/platform-admin/impersonate/${organizationId}`,
      { userId },
    );
    return unwrap<ImpersonateResult>(data);
  },
};
