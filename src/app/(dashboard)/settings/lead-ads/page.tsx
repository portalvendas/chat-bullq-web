'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Facebook, Plus, Trash2, Loader2, Copy, Check } from 'lucide-react';
import { api } from '@/lib/api';
import {
  leadAdsService,
  type LeadAdsPage,
} from '@/features/settings/services/lead-ads.service';

const WEBHOOK_URL = `${api.defaults.baseURL ?? ''}/webhooks/meta/leadads`;
const VERIFY_TOKEN = 'chatbullq';

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="mb-1 text-[11px] font-medium text-zinc-500">{label}</div>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
          {value}
        </code>
        <button
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function LeadAdsSettingsPage() {
  const qc = useQueryClient();
  const { data: pages = [], isLoading } = useQuery({
    queryKey: ['lead-ads-pages'],
    queryFn: () => leadAdsService.list(),
    staleTime: 30_000,
  });

  const [pageId, setPageId] = useState('');
  const [pageName, setPageName] = useState('');
  const [accessToken, setAccessToken] = useState('');

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['lead-ads-pages'] });

  const save = useMutation({
    mutationFn: () =>
      leadAdsService.save({
        pageId: pageId.trim(),
        pageName: pageName.trim() || undefined,
        accessToken: accessToken.trim(),
      }),
    onSuccess: (res) => {
      if (res?.subscription && !res.subscription.ok) {
        toast.warning(
          `Página salva, mas a assinatura do leadgen falhou: ${res.subscription.error ?? 'erro'}. Verifique se o token tem pages_manage_metadata.`,
        );
      } else {
        toast.success('Página conectada e inscrita no leadgen');
      }
      setPageId('');
      setPageName('');
      setAccessToken('');
      invalidate();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? 'Erro ao conectar página'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => leadAdsService.remove(id),
    onSuccess: () => {
      toast.success('Página removida');
      invalidate();
    },
    onError: () => toast.error('Erro ao remover'),
  });

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center gap-2">
        <Facebook className="h-5 w-5 text-[#1877F2]" />
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Facebook Leads Ads
          </h2>
          <p className="text-xs text-zinc-500">
            Recebe automaticamente os leads dos formulários instantâneos e cria
            um card na etapa de entrada do funil.
          </p>
        </div>
      </div>

      {/* Config do webhook na Meta */}
      <div className="mb-6 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          1. Configure o webhook no app da Meta
        </div>
        <p className="mb-3 text-xs text-zinc-500">
          No painel do app Meta → Webhooks → objeto <b>Page</b>, assine o campo{' '}
          <b>leadgen</b> com a URL e o token abaixo.
        </p>
        <div className="space-y-2.5">
          <CopyField label="Callback URL" value={WEBHOOK_URL} />
          <CopyField label="Verify token" value={VERIFY_TOKEN} />
        </div>
      </div>

      {/* Conectar página */}
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        2. Conecte a página
      </div>
      <p className="mb-3 text-xs text-zinc-500">
        Cole o <b>Page ID</b> e um <b>Page Access Token</b> com a permissão{' '}
        <code>leads_retrieval</code>. Ex. da sua conta: página “Armazém Decora”
        (ID 106871817645435).
      </p>
      <div className="space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <div className="grid grid-cols-2 gap-2">
          <input
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
            placeholder="Page ID (ex: 106871817645435)"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-mono outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <input
            value={pageName}
            onChange={(e) => setPageName(e.target.value)}
            placeholder="Nome da página (opcional)"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
        <textarea
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          rows={2}
          placeholder="Page Access Token (leads_retrieval)"
          className="w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-mono outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <div className="flex justify-end">
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || !pageId.trim() || !accessToken.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {save.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Conectar página
          </button>
        </div>
      </div>

      {/* Páginas conectadas */}
      <div className="mt-6">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Páginas conectadas
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : pages.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-6 text-center text-xs text-zinc-400 dark:border-zinc-800">
            Nenhuma página conectada ainda.
          </p>
        ) : (
          <ul className="space-y-2">
            {pages.map((p: LeadAdsPage) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <Facebook className="h-4 w-4 text-[#1877F2]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {p.pageName || 'Página do Facebook'}
                  </div>
                  <div className="font-mono text-[11px] text-zinc-500">{p.pageId}</div>
                </div>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  ativa
                </span>
                <button
                  onClick={() =>
                    confirm('Remover esta página?') && remove.mutate(p.id)
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
