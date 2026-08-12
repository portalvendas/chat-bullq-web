import { api } from '@/lib/api';

export interface LeadWeight {
  userId: string;
  weight: number;
}
export interface LeadDistributionConfig {
  enabled: boolean;
  weights: LeadWeight[];
}

export const leadDistributionService = {
  async getConfig(): Promise<LeadDistributionConfig> {
    const { data } = await api.get('/lead-distribution/config');
    return (data?.data ?? data) as LeadDistributionConfig;
  },
  async updateConfig(dto: {
    enabled?: boolean;
    weights?: LeadWeight[];
  }): Promise<LeadDistributionConfig> {
    const { data } = await api.put('/lead-distribution/config', dto);
    return (data?.data ?? data) as LeadDistributionConfig;
  },
};
