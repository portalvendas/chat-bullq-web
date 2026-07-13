import { api } from '@/lib/api';

export interface MlDirectoryItem {
  larguraCm: number;
  mlb: string;
  url: string;
}
export interface MlDirectoryCategory {
  categoria: string;
  itens: MlDirectoryItem[];
}
export interface MlDirectory {
  total: number;
  note: string | null;
  categorias: MlDirectoryCategory[];
}
export interface MlDirectoryImportResult {
  imported: number;
  categorias: number;
  note: string | null;
}

const BASE = '/integrations/mercado-livre/directory';

export const mlDirectoryService = {
  async get(): Promise<MlDirectory> {
    const { data } = await api.get(BASE);
    return data?.data ?? data;
  },
  async import(text: string): Promise<MlDirectoryImportResult> {
    const { data } = await api.post(`${BASE}/import`, { text });
    return data?.data ?? data;
  },
};
