import { api } from '@/lib/api';

function unwrap<T>(data: any): T {
  return (data?.data ?? data) as T;
}

export interface CurrentOrganization {
  id: string;
  name: string;
  slug?: string;
  logoUrl?: string | null;
}

export const organizationService = {
  /** Dados da organização atual (GET /organizations/current). */
  async getCurrent(): Promise<CurrentOrganization> {
    const { data } = await api.get('/organizations/current');
    return unwrap<CurrentOrganization>(data);
  },
  /** Renomeia a organização atual (PATCH /organizations/current). */
  async updateName(name: string): Promise<CurrentOrganization> {
    const { data } = await api.patch('/organizations/current', { name });
    return unwrap<CurrentOrganization>(data);
  },
};
