'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import {
  customFieldsService,
  type CustomFieldEntity,
  type CustomFieldType,
} from '@/features/imports/services';

const TYPE_LABEL: Record<CustomFieldType, string> = {
  TEXT: 'Texto',
  NUMBER: 'Número',
  DATE: 'Data',
  BOOLEAN: 'Sim/Não',
};
const ENTITY_LABEL: Record<CustomFieldEntity, string> = {
  CARD: 'Lead (card)',
  CONTACT: 'Contato',
};

const inputCls =
  'rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';

export default function CustomFieldsPage() {
  const qc = useQueryClient();
  const [label, setLabel] = useState('');
  const [type, setType] = useState<CustomFieldType>('TEXT');
  const [entity, setEntity] = useState<CustomFieldEntity>('CARD');
  const [saving, setSaving] = useState(false);

  const { data: fields = [], isLoading } = useQuery({
    queryKey: ['custom-fields'],
    queryFn: () => customFieldsService.list(),
  });

  const handleCreate = async () => {
    if (!label.trim()) return;
    setSaving(true);
    try {
      await customFieldsService.create({ label: label.trim(), type, entity });
      toast.success('Campo criado');
      setLabel('');
      qc.invalidateQueries({ queryKey: ['custom-fields'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao criar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, lbl: string) => {
    if (!confirm(`Excluir o campo "${lbl}"? (os valores já gravados nos leads permanecem no metadata)`)) return;
    try {
      await customFieldsService.remove(id);
      qc.invalidateQueries({ queryKey: ['custom-fields'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao excluir');
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <ListChecks className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Campos personalizados
        </h2>
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        Campos extras dos leads/contatos (além de nome, telefone, e-mail). São
        preenchidos na importação e exibidos no card. O valor fica no metadata.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Nome do campo
          </label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="ex: Endereço de entrega"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className={`mt-1 w-full ${inputCls}`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Tipo
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as CustomFieldType)}
            className={`mt-1 ${inputCls}`}
          >
            {(Object.keys(TYPE_LABEL) as CustomFieldType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Aplica em
          </label>
          <select
            value={entity}
            onChange={(e) => setEntity(e.target.value as CustomFieldEntity)}
            className={`mt-1 ${inputCls}`}
          >
            {(Object.keys(ENTITY_LABEL) as CustomFieldEntity[]).map((e) => (
              <option key={e} value={e}>
                {ENTITY_LABEL[e]}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleCreate}
          disabled={saving || !label.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {isLoading && <p className="text-sm text-zinc-400">Carregando…</p>}
        {!isLoading && fields.length === 0 && (
          <p className="rounded-lg border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-400 dark:border-zinc-800">
            Nenhum campo personalizado ainda.
          </p>
        )}
        {fields.map((f) => (
          <div
            key={f.id}
            className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {f.label}
              </p>
              <p className="text-xs text-zinc-400">
                <code>{f.key}</code> · {TYPE_LABEL[f.type]} · {ENTITY_LABEL[f.entity]}
              </p>
            </div>
            <button
              onClick={() => handleDelete(f.id, f.label)}
              className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
              title="Excluir campo"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
