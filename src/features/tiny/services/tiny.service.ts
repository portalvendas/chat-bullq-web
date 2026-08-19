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
  lead: {
    id: string;
    name: string | null;
    phone: string | null;
    conversationId: string | null;
  } | null;
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

export interface TinyResumo {
  totalProdutos: number | null;
  desconto: number | null;
  descontoPercent: number | null;
  frete: number | null;
  outrasDespesas: number | null;
  total: number | null;
  condicaoPagamento: string | null;
  formaRecebimento: string | null;
  meioPagamento: string | null;
  contaBancaria: string | null;
}

export interface TinyItemsResponse {
  items: TinyItem[];
  resumo: TinyResumo;
}

export interface MetaCapiConfig {
  enabled: boolean;
  pixelId: string | null;
  apiVersion: string;
  testEventCode: string | null;
  currency: string;
  purchaseSituacoes: string[];
  addToCartEnabled: boolean;
  addToCartSituacoes: string[];
  hasToken: boolean;
  lastError: string | null;
}
export interface MetaCapiConfigInput {
  enabled?: boolean;
  pixelId?: string | null;
  accessToken?: string | null;
  apiVersion?: string;
  testEventCode?: string | null;
  purchaseSituacoes?: string[];
  addToCartEnabled?: boolean;
  addToCartSituacoes?: string[];
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
  async items(docId: string): Promise<TinyItemsResponse> {
    const { data } = await api.get(`/tiny/documents/${docId}/items`);
    const r = unwrap<TinyItemsResponse>(data);
    return {
      items: r?.items ?? [],
      resumo:
        r?.resumo ?? {
          totalProdutos: null,
          desconto: null,
          descontoPercent: null,
          frete: null,
          outrasDespesas: null,
          total: null,
          condicaoPagamento: null,
          formaRecebimento: null,
          meioPagamento: null,
          contaBancaria: null,
        },
    };
  },
  async capiConfig(): Promise<MetaCapiConfig> {
    const { data } = await api.get('/tiny/capi/config');
    return unwrap<MetaCapiConfig>(data);
  },
  async updateCapiConfig(dto: MetaCapiConfigInput): Promise<MetaCapiConfig> {
    const { data } = await api.put('/tiny/capi/config', dto);
    return unwrap<MetaCapiConfig>(data);
  },
};

/** Situações de pedido do Tiny (pra multiseleção de Purchase). */
export const TINY_PEDIDO_SITUACOES = [
  'Aberta',
  'Aprovada',
  'Preparando Envio',
  'Faturada',
  'Pronto Envio',
  'Enviada',
  'Entregue',
  'Dados Incompletos',
  'Cancelada',
  'Não Entregue',
];
