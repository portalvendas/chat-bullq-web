import { api } from '@/lib/api';

/** Módulos governados pelo RBAC (espelha o backend). */
export const RBAC_MODULES: { key: string; label: string }[] = [
  { key: 'inbox', label: 'Inbox / Conversas' },
  { key: 'pipelines', label: 'Funil de Vendas' },
  { key: 'marketplaces', label: 'Marketplaces' },
  { key: 'salesbots', label: 'Salesbots' },
  { key: 'jarvis', label: 'Agentes de IA (Jarvis)' },
  { key: 'automations', label: 'Automações' },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'contacts', label: 'Contatos' },
  { key: 'templates', label: 'Modelos (WhatsApp)' },
  { key: 'knowledge', label: 'Base de Conhecimento' },
  { key: 'settings', label: 'Configurações' },
];

export interface ModulePerm {
  view: boolean;
  edit: boolean;
  delete: boolean;
}
export type ModulePerms = Record<string, ModulePerm>;

export interface PermissionGroup {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  modulePerms: ModulePerms;
  allChannels: boolean;
  channelIds: string[];
  allPipelines: boolean;
  pipelineIds: string[];
  _count?: { members: number };
}

export interface PermissionGroupInput {
  name: string;
  description?: string | null;
  modulePerms?: ModulePerms;
  allChannels?: boolean;
  channelIds?: string[];
  allPipelines?: boolean;
  pipelineIds?: string[];
}

export interface EffectivePermissions {
  role: 'OWNER' | 'ADMIN' | 'AGENT';
  fullAccess: boolean;
  permissionGroupId: string | null;
  modules: ModulePerms;
  channels: { all: boolean; ids: string[] };
  pipelines: { all: boolean; ids: string[] };
}

function unwrap<T>(data: any): T {
  return (data?.data ?? data) as T;
}

export const permissionGroupsService = {
  async list(): Promise<PermissionGroup[]> {
    const { data } = await api.get('/permission-groups');
    return unwrap<PermissionGroup[]>(data) ?? [];
  },
  async create(dto: PermissionGroupInput): Promise<PermissionGroup> {
    const { data } = await api.post('/permission-groups', dto);
    return unwrap<PermissionGroup>(data);
  },
  async update(id: string, dto: PermissionGroupInput): Promise<PermissionGroup> {
    const { data } = await api.patch(`/permission-groups/${id}`, dto);
    return unwrap<PermissionGroup>(data);
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/permission-groups/${id}`);
  },
  async assign(memberId: string, permissionGroupId: string | null): Promise<void> {
    await api.patch(`/permission-groups/assign/${memberId}`, { permissionGroupId });
  },
  async myEffective(): Promise<EffectivePermissions | null> {
    const { data } = await api.get('/permission-groups/me/effective');
    return unwrap<EffectivePermissions | null>(data);
  },
};
