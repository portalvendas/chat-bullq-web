import { api } from '@/lib/api';

export interface LeadWeight {
  userId: string;
  weight: number;
}
/** Regra de distribuição de UM funil. pipelineId "*" = padrão dos demais. */
export interface PipelineRule {
  pipelineId: string;
  weights: LeadWeight[];
}
export interface LeadDistributionConfig {
  enabled: boolean;
  /** Pesos por funil. Cada funil tem a sua própria classificação. */
  rules: PipelineRule[];
}

/** Vendedor = usuário que participa da distribuição (peso > 0). */
export interface Seller {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
}

export const leadDistributionService = {
  async getConfig(): Promise<LeadDistributionConfig> {
    const { data } = await api.get('/lead-distribution/config');
    return (data?.data ?? data) as LeadDistributionConfig;
  },
  async listSellers(): Promise<Seller[]> {
    const { data } = await api.get('/lead-distribution/sellers');
    return (data?.data ?? data ?? []) as Seller[];
  },
  async updateConfig(dto: {
    enabled?: boolean;
    rules?: PipelineRule[];
  }): Promise<LeadDistributionConfig> {
    const { data } = await api.put('/lead-distribution/config', dto);
    return (data?.data ?? data) as LeadDistributionConfig;
  },
};
