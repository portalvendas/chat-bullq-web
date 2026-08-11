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

export interface TinyVendorRow {
  vendedor: string;
  pedidosCount: number;
  pedidosTotal: number;
  propostasCount: number;
  propostasTotal: number;
}

export interface TinySummary {
  pedidos: { count: number; total: number };
  orcamentos: { count: number; total: number };
  porVendedor: TinyVendorRow[];
}

export interface TinyPeriod {
  from?: string;
  to?: string;
}

export interface TinyOrderRow {
  id: string;
  kind: 'PEDIDO' | 'ORCAMENTO';
  tinyId: string;
  numero: string | null;
  situacao: string | null;
  data: string | null;
  valor: number | null;
  clienteNome: string | null;
  clienteTelefone: string | null;
  vendedor: string | null;
  matchedBy: string | null;
  lead: { id: string; name: string | null; phone: string | null } | null;
}

export interface TinyOrdersPage {
  items: TinyOrderRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface TinyItem {
  descricao: string;
  sku: string | null;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  infoAdicional: string | null;
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
  async summary(period: TinyPeriod = {}): Promise<TinySummary> {
    const { data } = await api.get('/tiny/summary', { params: period });
    return unwrap<TinySummary>(data);
  },
  async orders(
    kind: 'PEDIDO' | 'ORCAMENTO',
    page = 1,
    limit = 30,
    period: TinyPeriod = {},
  ): Promise<TinyOrdersPage> {
    const { data } = await api.get('/tiny/orders', {
      params: { kind, page, limit, ...period },
    });
    return unwrap<TinyOrdersPage>(data);
  },
  async items(docId: string): Promise<TinyItem[]> {
    const { data } = await api.get(`/tiny/documents/${docId}/items`);
    return unwrap<{ items: TinyItem[] }>(data)?.items ?? [];
  },
};
