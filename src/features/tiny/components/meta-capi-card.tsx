'use client';

/**
 * Card de configuração da integração com a Conversions API (CAPI) da Meta.
 * Nasce desligada; o operador informa Pixel/Dataset ID + token, escolhe as
 * situações de pedido que disparam `Purchase` e liga o `AddToCart` das
 * propostas. O token nunca volta do backend (só `hasToken`).
 */
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, BarChart3, CheckCircle2 } from 'lucide-react';
import {
  tinyService,
  TINY_PEDIDO_SITUACOES,
  type MetaCapiConfig,
} from '../services/tiny.service';

export function MetaCapiCard() {
  const qc = useQueryClient();
  const { data: cfg, isLoading } = useQuery({
    queryKey: ['tiny-capi-config'],
    queryFn: () => tinyService.capiConfig(),
    staleTime: 30_000,
  });

  // Estado local do formulário (token só é enviado quando digitado).
  const [form, setForm] = useState<Partial<MetaCapiConfig>>({});
  const [token, setToken] = useState('');
  useEffect(() => {
    if (cfg) setForm(cfg);
  }, [cfg]);

  const save = useMutation({
    mutationFn: () =>
      tinyService.updateCapiConfig({
        enabled: form.enabled,
        pixelId: form.pixelId ?? null,
        apiVersion: form.apiVersion,
        testEventCode: form.testEventCode ?? null,
        purchaseSituacoes: form.purchaseSituacoes ?? [],
        addToCartEnabled: form.addToCartEnabled,
        addToCartSituacoes: form.addToCartSituacoes ?? [],
        ...(token.trim() ? { accessToken: token.trim() } : {}),
      }),
    onSuccess: (updated) => {
      setToken('');
      qc.setQueryData(['tiny-capi-config'], updated);
      toast.success('Configuração da Meta CAPI salva');
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'Falha ao salvar'),
  });

  const togglePurchase = (s: string) => {
    const cur = form.purchaseSituacoes ?? [];
    setForm({
      ...form,
      purchaseSituacoes: cur.includes(s)
        ? cur.filter((x) => x !== s)
        : [...cur, s],
    });
  };

  if (isLoading) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-lg border border-zinc-200 p-5 text-sm text-zinc-400 dark:border-zinc-800">
        <Loader2 className="h-4 w-4 animate-spin" /> carregando…
      </div>
    );
  }

  const purchaseSel = form.purchaseSituacoes ?? [];

  return (
    <div className="mt-4 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
              Meta Conversions API (CAPI)
            </h3>
            {cfg?.enabled && cfg?.hasToken && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> ativa
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Envia eventos de conversão pra Meta a partir dos pedidos/propostas do
            Tiny (dados do cliente hasheados em SHA-256). Proposta → AddToCart;
            pedido → Purchase (com valor).
          </p>
          {cfg?.lastError && (
            <p className="mt-1 text-xs text-red-500">Último erro: {cfg.lastError}</p>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {/* Ativar */}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            className="h-4 w-4 rounded border-zinc-300"
          />
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            Integração ativa
          </span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-zinc-500">Pixel / Dataset ID</label>
            <input
              value={form.pixelId ?? ''}
              onChange={(e) => setForm({ ...form, pixelId: e.target.value })}
              placeholder="123456789012345"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500">
              Token da CAPI {cfg?.hasToken && <span className="text-emerald-500">(salvo)</span>}
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={cfg?.hasToken ? '•••••••• (deixe em branco pra manter)' : 'cole o token aqui'}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500">Test Event Code (opcional)</label>
            <input
              value={form.testEventCode ?? ''}
              onChange={(e) => setForm({ ...form, testEventCode: e.target.value })}
              placeholder="TEST12345"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
        </div>

        {/* Situações -> Purchase */}
        <div>
          <label className="text-xs font-medium text-zinc-500">
            Situações do pedido que disparam <b>Purchase</b>
          </label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {TINY_PEDIDO_SITUACOES.map((s) => {
              const on = purchaseSel.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => togglePurchase(s)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    on
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-zinc-300 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-[11px] text-zinc-400">
            Deixe como preferir — dá pra ajustar quando decidir o critério (ex.: só Faturada).
          </p>
        </div>

        {/* AddToCart */}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!form.addToCartEnabled}
            onChange={(e) => setForm({ ...form, addToCartEnabled: e.target.checked })}
            className="h-4 w-4 rounded border-zinc-300"
          />
          <span className="text-zinc-800 dark:text-zinc-200">
            Disparar <b>AddToCart</b> para propostas/orçamentos
          </span>
        </label>

        <div>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </button>
          <p className="mt-2 text-[11px] text-zinc-400">
            Eventos são disparados no sync do Tiny (a cada 15 min), só para vendas dos
            últimos 7 dias (janela da Meta), de forma idempotente. Enquanto desligada,
            nada é enviado.
          </p>
        </div>
      </div>
    </div>
  );
}
