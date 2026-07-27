import { api } from '@/lib/api';

function unwrap<T>(data: any): T {
  return (data?.data ?? data) as T;
}

export const lossReasonsService = {
  async get(): Promise<string[]> {
    const { data } = await api.get('/organizations/loss-reasons');
    return unwrap<{ reasons: string[] }>(data).reasons ?? [];
  },
  async set(reasons: string[]): Promise<string[]> {
    const { data } = await api.put('/organizations/loss-reasons', { reasons });
    return unwrap<{ reasons: string[] }>(data).reasons ?? [];
  },
};
