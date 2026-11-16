import { api } from '@/lib/api';

/** Vendedor virtual (IA): membership marcada isVirtual + agente vinculado. */
export interface VirtualSeller {
  id: string; // membership id (userOrganization.id)
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'AGENT';
  isVirtual: boolean;
  aiAgentId: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    isActive: boolean;
  };
  aiAgent: { id: string; name: string; isActive: boolean } | null;
}

function unwrap<T>(data: any, fallback?: T): T {
  return (data?.data ?? data ?? fallback) as T;
}

export const virtualSellersService = {
  async list(): Promise<VirtualSeller[]> {
    const { data } = await api.get('/organizations/virtual-sellers');
    return unwrap<VirtualSeller[]>(data, []);
  },
  async create(payload: {
    name: string;
    aiAgentId: string;
    avatarUrl?: string;
  }): Promise<VirtualSeller> {
    const { data } = await api.post('/organizations/virtual-sellers', payload);
    return unwrap<VirtualSeller>(data);
  },
  async update(
    membershipId: string,
    payload: { name?: string; aiAgentId?: string; avatarUrl?: string; active?: boolean },
  ): Promise<VirtualSeller> {
    const { data } = await api.patch(
      `/organizations/virtual-sellers/${membershipId}`,
      payload,
    );
    return unwrap<VirtualSeller>(data);
  },
  async remove(membershipId: string): Promise<void> {
    await api.delete(`/organizations/virtual-sellers/${membershipId}`);
  },
};
