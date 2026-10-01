import { api } from '@/lib/api';

export interface Cadastro {
  name?: string;
  email?: string;
  cpfCnpj?: string;
  birthDate?: string;
  cep?: string;
  estado?: string;
  cidade?: string;
  bairro?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  addressText?: string;
}

const unwrap = <T>(data: any): T => (data?.data ?? data) as T;

export const leadEnrichmentService = {
  async getCadastro(conversationId: string): Promise<Cadastro> {
    const { data } = await api.get(
      `/lead-enrichment/conversations/${conversationId}/cadastro`,
    );
    return unwrap<Cadastro>(data) ?? {};
  },
  async extract(
    conversationId: string,
  ): Promise<{ applied: string[]; cadastro: Cadastro }> {
    const { data } = await api.post(
      `/lead-enrichment/conversations/${conversationId}/extract`,
    );
    return unwrap(data);
  },
};
