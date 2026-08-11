import { api } from '@/lib/api';

export interface TinyStatus {
  connected: boolean;
  status?: string;
  accountName?: string | null;
  lastPedidosSyncAt?: string | null;
  lastOrcamentosSyncAt?: string | null;
  lastError?: string | null;
}

export interface TinyDocument {
  id: string;
  kind: 'PEDIDO' | 'ORCAMENTO';
  tinyId: string;
  numero: string | null;
  situacao: string | null;
  data: string | null;
  valor: string | number | null;
  clienteNome: string | null;
  clienteCpfCnpj: string | null;
  clienteTelefone: string | null;
  clienteEmail: string | null;
  matchedBy: string | null;
}

export interface TinyLeadDocuments {
  pedidos: TinyDocument[];
  orcamentos: TinyDocument[];
}

function unwrap<T>(data: any): T {
  return (data?.data ?? data) as T;
}

export const tinyService = {
  async status(): Promise<TinyStatus> {
    const { data } = await api.get('/tiny/status');
    return unwrap<TinyStatus>(data);
  },
  async startOAuth(): Promise<{ url: string }> {
    const { data } = await api.get('/tiny/oauth/start');
    return unwrap<{ url: string }>(data);
  },
  async sync(): Promise<{ pedidos: number; orcamentos: number }> {
    const { data } = await api.post('/tiny/sync', {});
    return unwrap(data);
  },
  async disconnect(): Promise<void> {
    await api.delete('/tiny/connection');
  },
  async documentsForContact(contactId: string): Promise<TinyLeadDocuments> {
    const { data } = await api.get('/tiny/documents', { params: { contactId } });
    return unwrap<TinyLeadDocuments>(data) ?? { pedidos: [], orcamentos: [] };
  },
};
