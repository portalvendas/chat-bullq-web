import { api } from '@/lib/api';

export type PercentBase = 'EXCEDENTE' | 'TOTAL';

export interface CommissionPlan {
  id: string;
  vendedor: string;
  userId: string | null;
  active: boolean;
  fixedAmount: number;
  goalAmount: number;
  percent: number;
  percentBase: PercentBase;
  keepFixed: boolean;
  notes: string | null;
}

export interface PlansResponse {
  plans: CommissionPlan[];
  vendedores: string[];
  users: { id: string; name: string }[];
}

export interface CommissionCalc {
  vendas: number;
  meta: number;
  atingimento: number | null;
  bateuMeta: boolean;
  fixo: number;
  baseVariavel: number;
  variavel: number;
  total: number;
}

export interface CommissionRow {
  vendedor: string;
  planId: string | null;
  temRegra: boolean;
  regraAtiva: boolean;
  metaDoMes: number | null;
  pedidos: number;
  bruto: number;
  frete: number;
  vendas: number;
  fretePendente: number;
  regra: {
    fixedAmount: number;
    goalAmount: number;
    percent: number;
    percentBase: PercentBase;
    keepFixed: boolean;
  } | null;
  calc: CommissionCalc | null;
}

export interface CommissionReport {
  month: string;
  rows: CommissionRow[];
  totais: {
    pedidos: number;
    bruto: number;
    frete: number;
    vendas: number;
    comissao: number;
    fretePendente: number;
  };
}

const unwrap = <T,>(d: any): T => (d?.data ?? d) as T;

export const commissionsService = {
  async plans(): Promise<PlansResponse> {
    const { data } = await api.get('/commissions/plans');
    return unwrap(data);
  },
  async savePlan(p: Partial<CommissionPlan> & { vendedor: string }): Promise<CommissionPlan> {
    const { data } = await api.put('/commissions/plans', p);
    return unwrap(data);
  },
  async deletePlan(id: string): Promise<void> {
    await api.delete(`/commissions/plans/${id}`);
  },
  async setGoal(vendedor: string, month: string, goalAmount: number | null): Promise<void> {
    await api.put('/commissions/goals', { vendedor, month, goalAmount });
  },
  async report(month: string): Promise<CommissionReport> {
    const { data } = await api.get('/commissions/report', { params: { month } });
    return unwrap(data);
  },
  async refreshFreight(month: string): Promise<{ checked: number; failed: number }> {
    const { data } = await api.post('/commissions/refresh-freight', null, { params: { month } });
    return unwrap(data);
  },
  async exportXlsx(month: string): Promise<Blob> {
    const { data } = await api.get('/commissions/report/export', {
      params: { month },
      responseType: 'blob',
    });
    return data as Blob;
  },
};
