'use client';

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  MessageSquareText,
  RefreshCw,
  Download,
  Loader2,
  Search,
  Trash2,
  Plus,
  Pencil,
  X,
} from 'lucide-react';
import {
  templatesService,
  type WhatsappTemplate,
  type TemplateInput,
} from '@/features/templates/services/templates.service';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };
  const label: Record<string, string> = {
    APPROVED: 'Aprovado',
    PENDING: 'Pendente',
    REJECTED: 'Rejeitado',
  };
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${
        map[status] ?? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
      }`}
    >
      {label[status] ?? status}
    </span>
  );
}

export default function TemplatesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<WhatsappTemplate | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['wa-templates', search, page],
    queryFn: () => templatesService.list({ search, page, pageSize: 50 }),
    staleTime: 10_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['wa-templates'] });

  const seed = useMutation({
    mutationFn: () => templatesService.seed(),
    onSuccess: (r) => {
      toast.success(`${r.seeded} modelos aprovados carregados`);
      invalidate();
    },
    onError: () => toast.error('Erro ao carregar modelos'),
  });
  const sync = useMutation({
    mutationFn: () => templatesService.sync(),
    onSuccess: (r) => {
      if (r.channels === 0) {
        toast.info('Nenhum canal WhatsApp oficial conectado para sincronizar.');
      } else {
        toast.success(
          `${r.synced} modelos sincronizados da Meta` +
            (r.errors.length ? ` (${r.errors.length} canal com erro)` : ''),
        );
      }
      invalidate();
    },
    onError: () => toast.error('Erro ao sincronizar com a Meta'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => templatesService.remove(id),
    onSuccess: () => invalidate(),
    onError: () => toast.error('Erro ao remover'),
  });

  const items: WhatsappTemplate[] = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="inline-flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          <MessageSquareText className="h-5 w-5 text-primary" />
          Modelos de chat
        </h1>
        <span className="text-sm text-zinc-400">{total} modelos</span>

        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Pesquisar…"
            className="w-56 rounded-lg border border-zinc-300 bg-white py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
        <button
          onClick={() => seed.mutate()}
          disabled={seed.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {seed.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Carregar aprovados
        </button>
        <button
          onClick={() => sync.mutate()}
          disabled={sync.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {sync.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Sincronizar Meta
        </button>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> Novo modelo
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center gap-2 p-8 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : items.length === 0 ? (
          <div className="mx-auto mt-16 max-w-md rounded-xl border border-dashed border-zinc-200 px-8 py-16 text-center dark:border-zinc-800">
            <MessageSquareText className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-600" />
            <p className="mt-3 text-sm text-zinc-500">
              Nenhum modelo ainda. Clique em <b>Carregar aprovados</b> para trazer
              os templates já aprovados pela Meta, ou <b>Sincronizar Meta</b> para
              puxar direto de um canal WhatsApp conectado.
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-zinc-50 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-2.5">Nome</th>
                <th className="px-4 py-2.5">Tipo</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Categoria</th>
                <th className="px-4 py-2.5">Idioma</th>
                <th className="px-4 py-2.5">ID WABA</th>
                <th className="px-4 py-2.5">Texto de resposta</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr
                  key={t.id}
                  className="border-t border-zinc-100 align-top hover:bg-zinc-50/60 dark:border-zinc-800 dark:hover:bg-zinc-900/40"
                >
                  <td className="px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">
                    {t.name}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">
                    WhatsApp
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">
                    {t.category === 'MARKETING'
                      ? 'Marketing'
                      : t.category === 'UTILITY'
                        ? 'Utilidade'
                        : t.category === 'AUTHENTICATION'
                          ? 'Autenticação'
                          : t.category}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">
                    {t.language === 'pt_BR' ? 'Português (BR)' : t.language}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[12px] text-zinc-500">
                    {t.waba ?? '—'}
                  </td>
                  <td className="max-w-md px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                    <span className="line-clamp-2">{t.bodyText}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditing(t)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() =>
                          confirm(`Remover o modelo "${t.name}"?`) && remove.mutate(t.id)
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-3 border-t border-zinc-200 py-2 text-xs text-zinc-500 dark:border-zinc-800">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded px-2 py-1 hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-800"
          >
            Anterior
          </button>
          <span>
            Página {data.page} de {data.pages}
          </span>
          <button
            disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded px-2 py-1 hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-800"
          >
            Próxima
          </button>
        </div>
      )}

      {(creating || editing) && (
        <TemplateEditor
          template={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            invalidate();
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function TemplateEditor({
  template,
  onClose,
  onSaved,
}: {
  template: WhatsappTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(template?.name ?? '');
  const [category, setCategory] = useState(template?.category ?? 'MARKETING');
  const [language, setLanguage] = useState(template?.language ?? 'pt_BR');
  const [status, setStatus] = useState(template?.status ?? 'APPROVED');
  const [waba, setWaba] = useState(template?.waba ?? '');
  const [bodyText, setBodyText] = useState(template?.bodyText ?? '');

  const save = useMutation({
    mutationFn: () => {
      const dto: TemplateInput = {
        name: name.trim(),
        bodyText: bodyText.trim(),
        category,
        language,
        status,
        waba: waba.trim() || null,
      };
      return template
        ? templatesService.update(template.id, dto)
        : templatesService.create(dto);
    },
    onSuccess: () => {
      toast.success(template ? 'Modelo atualizado' : 'Modelo criado');
      onSaved();
    },
    onError: () => toast.error('Erro ao salvar modelo'),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={() => !save.isPending && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {template ? 'Editar modelo' : 'Novo modelo'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
          Nome
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: BM02 FUP automático 1"
          className="mb-3 mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />

        <div className="mb-3 grid grid-cols-3 gap-2">
          <div>
            <label className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
              Categoria
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="MARKETING">Marketing</option>
              <option value="UTILITY">Utilidade</option>
              <option value="AUTHENTICATION">Autenticação</option>
            </select>
          </div>
          <div>
            <label className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
              Idioma
            </label>
            <input
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="APPROVED">Aprovado</option>
              <option value="PENDING">Pendente</option>
              <option value="REJECTED">Rejeitado</option>
            </select>
          </div>
        </div>

        <label className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
          ID WABA (opcional)
        </label>
        <input
          value={waba}
          onChange={(e) => setWaba(e.target.value)}
          placeholder="Ex: 1728403631734473"
          className="mb-3 mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-mono outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />

        <label className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
          Texto de resposta
        </label>
        <textarea
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          rows={4}
          placeholder="Texto do template…"
          className="mb-4 mt-1 w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={save.isPending}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || !name.trim() || !bodyText.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
