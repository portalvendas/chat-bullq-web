'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Upload, AlertTriangle, CheckCircle2, Loader2, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import {
  importsService,
  type ImportLeadRow,
  type ImportSummary,
  type CustomFieldInput,
} from '@/features/imports/services';

// Colunas do export do Kommo que mapeiam pra tracking (metadata.tracking).
const TRACKING: Record<string, string> = {
  utm_content: 'utm_content',
  utm_medium: 'utm_medium',
  utm_campaign: 'utm_campaign',
  utm_source: 'utm_source',
  utm_term: 'utm_term',
  utm_referrer: 'utm_referrer',
  referrer: 'referrer',
  gclid: 'gclid',
  gclientid: 'gclientid',
  fbclid: 'fbclid',
  ctwa_clid: 'ctwa_clid',
  client_ip: 'client_ip',
  user_agent: 'user_agent',
  leadgen_id: 'leadgen_id',
};

// Colunas nativas (mapeadas pra campos do lead) ou meta do Kommo (ignoradas).
const NATIVE = new Set([
  'ID Lead',
  'Nome do lead',
  'Funil',
  'Etapa atual',
  'Situação',
  'Valor (R$)',
  'Vendedor responsável',
  'Motivo de perda',
  'Contato principal',
  'Telefone principal',
  'Email principal',
  'Todos os telefones',
  'Todos os emails',
  'Tags',
  'Criado em',
  'Atualizado em',
  'Fechado em',
  'Criado por',
  'Atualizado por',
  'Score',
  'Excluído',
]);

function slugify(s: string): string {
  return (
    (s ?? '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || 'campo'
  );
}
const s = (v: any) =>
  v === null || v === undefined || v === '' ? null : String(v).trim();
const num = (v: any) => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const toIso = (v: any) => {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
};
const CHUNK = 25;

// SheetJS carregado sob demanda da CDN (evita virar dependência npm/lockfile).
let xlsxPromise: Promise<any> | null = null;
function loadXLSX(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).XLSX)
    return Promise.resolve((window as any).XLSX);
  if (!xlsxPromise) {
    xlsxPromise = new Promise((resolve, reject) => {
      const sc = document.createElement('script');
      sc.src =
        'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      sc.onload = () => resolve((window as any).XLSX);
      sc.onerror = () => reject(new Error('Falha ao carregar o leitor de planilha'));
      document.head.appendChild(sc);
    });
  }
  return xlsxPromise;
}

interface BackfillResult {
  corrigiveis: number;
  dataMin: string | null;
  dataMax: string | null;
  atualizados: number;
}

/** Corrige a data (createdAt) dos leads importados do Kommo que ficaram com a
 *  data da importação, usando a "Criado em" original guardada no metadata. */
function BackfillDatesCard() {
  const [res, setRes] = useState<BackfillResult | null>(null);
  const [mode, setMode] = useState<'preview' | 'exec' | null>(null);
  const run = (execute: boolean) =>
    api
      .post(`/imports/backfill-dates${execute ? '?execute=true' : ''}`, {})
      .then((r) => r.data.data ?? r.data);
  const preview = useMutation({
    mutationFn: () => run(false),
    onSuccess: (r: BackfillResult) => {
      setRes(r);
      setMode('preview');
      toast.success(`${r.corrigiveis} card(s) com data a corrigir`);
    },
    onError: (e: any) => toast.error(e?.message ?? 'Falha na prévia'),
  });
  const execute = useMutation({
    mutationFn: () => run(true),
    onSuccess: (r: BackfillResult) => {
      setRes(r);
      setMode('exec');
      toast.success(`${r.atualizados} data(s) corrigida(s)`);
    },
    onError: (e: any) => toast.error(e?.message ?? 'Falha ao corrigir'),
  });
  const busy = preview.isPending || execute.isPending;
  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        <CalendarClock className="h-4 w-4 text-amber-500" />
        Corrigir datas dos leads importados
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Leads que ficaram com a data da importação são corrigidos para a data
        original (&quot;Criado em&quot;) do Kommo, guardada no lead. Rode a
        prévia antes de aplicar.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => preview.mutate()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-white disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {preview.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Rodar prévia
        </button>
        <button
          onClick={() => {
            if (window.confirm('Corrigir as datas dos leads importados agora?'))
              execute.mutate();
          }}
          disabled={busy || !res || res.corrigiveis === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          {execute.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Corrigir agora
        </button>
      </div>
      {res && (
        <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-300">
          {mode === 'exec'
            ? `${res.atualizados} data(s) corrigida(s).`
            : `${res.corrigiveis} card(s) a corrigir`}
          {res.corrigiveis > 0 && (
            <> — datas de {fmt(res.dataMin)} a {fmt(res.dataMax)}</>
          )}
        </div>
      )}
    </div>
  );
}

interface LeadScoreResult {
  corrigiveis: number;
  valorAjustar: number;
  contatos: number;
  atualizados: number;
  tagsAplicadas: number;
}

/** Corrige cards da LP cujo Valor recebeu o lead score: zera Valor, grava a
 *  temperatura e aplica a tag Lead Quente/Morno/Frio no contato. */
function BackfillLeadScoreCard() {
  const [res, setRes] = useState<LeadScoreResult | null>(null);
  const [mode, setMode] = useState<'preview' | 'exec' | null>(null);
  const run = (execute: boolean) =>
    api
      .post(`/imports/backfill-leadscore${execute ? '?execute=true' : ''}`, {})
      .then((r) => r.data.data ?? r.data);
  const preview = useMutation({
    mutationFn: () => run(false),
    onSuccess: (r: LeadScoreResult) => {
      setRes(r);
      setMode('preview');
      toast.success(`${r.valorAjustar} card(s) com Valor = score`);
    },
    onError: (e: any) => toast.error(e?.message ?? 'Falha na prévia'),
  });
  const execute = useMutation({
    mutationFn: () => run(true),
    onSuccess: (r: LeadScoreResult) => {
      setRes(r);
      setMode('exec');
      toast.success(
        `${r.atualizados} card(s) corrigido(s), ${r.tagsAplicadas} tag(s) aplicadas`,
      );
    },
    onError: (e: any) => toast.error(e?.message ?? 'Falha ao corrigir'),
  });
  const busy = preview.isPending || execute.isPending;

  return (
    <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50/50 p-4 dark:border-orange-500/20 dark:bg-orange-500/5">
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        <CalendarClock className="h-4 w-4 text-orange-500" />
        Corrigir Valor x Lead Score (leads da LP)
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Cards em que o "Valor R$" recebeu o lead score: zera o Valor, grava a
        temperatura no card e aplica a tag Lead Quente/Morno/Frio no contato
        (aparece no WhatsApp). Rode a prévia antes.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => preview.mutate()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-white disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {preview.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Rodar prévia
        </button>
        <button
          onClick={() => {
            if (window.confirm('Corrigir os leads com Valor = score agora?'))
              execute.mutate();
          }}
          disabled={busy || !res || res.valorAjustar === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          {execute.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Corrigir agora
        </button>
      </div>
      {res && (
        <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-300">
          {mode === 'exec'
            ? `${res.atualizados} card(s) corrigido(s), ${res.tagsAplicadas} tag(s) de temperatura aplicadas.`
            : `${res.corrigiveis} com lead score · ${res.valorAjustar} com Valor = score · ${res.contatos} contato(s).`}
        </div>
      )}
    </div>
  );
}

export default function ImportPage() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[][]>([]);
  const [fileName, setFileName] = useState('');
  const [pipelineId, setPipelineId] = useState('');
  const [createStages, setCreateStages] = useState(true);
  const [customCols, setCustomCols] = useState<Record<string, boolean>>({});
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportSummary | null>(null);

  const { data: pipelines = [] } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => pipelinesService.list(false),
  });

  const idx = useMemo(() => {
    const m: Record<string, number> = {};
    headers.forEach((h, i) => (m[h] = i));
    return m;
  }, [headers]);
  const val = (r: any[], h: string) => (h in idx ? r[idx[h]] : null);

  const onFile = async (file: File) => {
    setResult(null);
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    const XLSX = await loadXLSX();
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const aoa = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: null,
      raw: true,
    }) as any[][];
    const hdr = (aoa[0] || []).map((h) => (h == null ? '' : String(h)));
    setHeaders(hdr);
    setRows(aoa.slice(1).filter((r) => r.some((c) => c != null && c !== '')));
    // pré-seleciona pipeline "Funil de Vendas" se existir
    setCustomCols({});
  };

  // Colunas candidatas a campo personalizado: não-nativas, não-tracking, com dado.
  const candidateCustom = useMemo(() => {
    return headers.filter((h) => {
      if (!h || NATIVE.has(h) || h in TRACKING) return false;
      const i = idx[h];
      return rows.some((r) => r[i] != null && r[i] !== '');
    });
  }, [headers, rows, idx]);

  const distinctFunnels = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const f = s(val(r, 'Funil'));
      if (f) set.add(f);
    });
    return [...set];
  }, [rows, idx]);

  const distinctStages = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const st = s(val(r, 'Etapa atual'));
      if (st) set.add(st);
    });
    return [...set];
  }, [rows, idx]);

  const selectedPipeline = pipelines.find((p) => p.id === pipelineId);
  const existingStages = new Set(
    (selectedPipeline?.stages ?? []).map((st) => st.name.toLowerCase()),
  );
  const missingStages = distinctStages.filter(
    (st) => !existingStages.has(st.toLowerCase()),
  );

  const buildRow = (r: any[]): ImportLeadRow => {
    const tracking: Record<string, any> = {};
    for (const [h, k] of Object.entries(TRACKING)) {
      const v = val(r, h);
      if (v != null && v !== '') tracking[k] = String(v);
    }
    const custom: Record<string, any> = {};
    for (const h of candidateCustom) {
      if (!customCols[h]) continue;
      const v = val(r, h);
      if (v != null && v !== '') custom[slugify(h)] = v instanceof Date ? toIso(v) : v;
    }
    const tagsRaw = s(val(r, 'Tags'));
    return {
      externalId: s(val(r, 'ID Lead')),
      title: s(val(r, 'Nome do lead')),
      contactName: s(val(r, 'Contato principal')),
      phone: s(val(r, 'Telefone principal')) || s(val(r, 'Todos os telefones')),
      email: s(val(r, 'Email principal')) || s(val(r, 'Todos os emails')),
      stageName: s(val(r, 'Etapa atual')),
      status: s(val(r, 'Situação')),
      value: num(val(r, 'Valor (R$)')),
      closedReason: s(val(r, 'Motivo de perda')),
      tags: tagsRaw ? tagsRaw.split(/[;,]/).map((t) => t.trim()).filter(Boolean) : [],
      createdAt: toIso(val(r, 'Criado em')),
      tracking,
      custom,
    };
  };

  const handleImport = async () => {
    if (!pipelineId) {
      toast.error('Escolha o funil de destino');
      return;
    }
    setRunning(true);
    setProgress(0);
    const all = rows.map(buildRow);
    const customFields: CustomFieldInput[] = candidateCustom
      .filter((h) => customCols[h])
      .map((h) => ({ label: h, key: slugify(h), type: 'TEXT', entity: 'CARD' }));

    const agg: ImportSummary = {
      contactsCreated: 0,
      contactsUpdated: 0,
      cardsCreated: 0,
      cardsUpdated: 0,
      cardsSkipped: 0,
      stagesCreated: 0,
      errors: [],
    };
    try {
      for (let i = 0; i < all.length; i += CHUNK) {
        const batch = all.slice(i, i + CHUNK);
        const res = await importsService.importLeads({
          pipelineId,
          createMissingStages: createStages,
          // manda as defs só no 1º lote (idempotente de qualquer forma)
          customFields: i === 0 ? customFields : undefined,
          rows: batch,
        });
        agg.contactsCreated += res.contactsCreated;
        agg.contactsUpdated += res.contactsUpdated;
        agg.cardsCreated += res.cardsCreated;
        agg.cardsUpdated += res.cardsUpdated;
        agg.cardsSkipped += res.cardsSkipped;
        agg.stagesCreated += res.stagesCreated;
        agg.errors.push(...res.errors);
        setProgress(Math.min(100, Math.round(((i + batch.length) / all.length) * 100)));
      }
      setResult(agg);
      toast.success(`Importação concluída: ${agg.cardsCreated} leads criados`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro na importação');
    } finally {
      setRunning(false);
    }
  };

  const inputCls =
    'rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';

  return (
    <div>
      <div className="flex items-center gap-2">
        <Upload className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Importar leads (Kommo)
        </h2>
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        Suba o XLSX exportado do Kommo. Mapeamos contato, telefone, valor,
        tracking (UTM/fbclid) e criamos etapas/campos que faltarem.
      </p>

      <BackfillDatesCard />
      <BackfillLeadScoreCard />

      {/* Upload */}
      <label className="mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 p-8 text-center hover:border-primary/40 dark:border-zinc-700">
        <Upload className="h-8 w-8 text-zinc-400" />
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
          {fileName || 'Clique para escolher o arquivo .xlsx'}
        </span>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </label>

      {rows.length > 0 && (
        <div className="mt-5 space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-zinc-700 dark:text-zinc-200">
              <strong>{rows.length}</strong> leads · {headers.length} colunas ·
              funil(s): {distinctFunnels.join(', ') || '—'}
            </p>
            {distinctFunnels.length > 1 && (
              <p className="mt-1 text-xs text-amber-600">
                A planilha tem mais de um funil — todos vão para o funil de
                destino escolhido abaixo.
              </p>
            )}
          </div>

          {/* Funil destino */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Funil de destino
            </label>
            <select
              value={pipelineId}
              onChange={(e) => setPipelineId(e.target.value)}
              className={`mt-1 ${inputCls}`}
            >
              <option value="">Escolha…</option>
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Etapas */}
          {pipelineId && (
            <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Etapas encontradas ({distinctStages.length})
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {distinctStages.map((st) => {
                  const missing = missingStages.includes(st);
                  return (
                    <span
                      key={st}
                      className={`rounded-full px-2 py-0.5 text-[11px] ${
                        missing
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}
                    >
                      {st}
                      {missing ? ' (nova)' : ' ✓'}
                    </span>
                  );
                })}
              </div>
              {missingStages.length > 0 && (
                <label className="mt-3 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={createStages}
                    onChange={(e) => setCreateStages(e.target.checked)}
                  />
                  Criar as {missingStages.length} etapas novas no funil (espelhar
                  o Kommo). Se desmarcar, esses leads caem na 1ª etapa.
                </label>
              )}
            </div>
          )}

          {/* Campos personalizados */}
          {candidateCustom.length > 0 && (
            <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Colunas extras → campos personalizados
              </p>
              <p className="mt-0.5 text-xs text-zinc-400">
                Marque as que quer importar como campo personalizado do lead.
              </p>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {candidateCustom.map((h) => (
                  <label
                    key={h}
                    className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                  >
                    <input
                      type="checkbox"
                      checked={!!customCols[h]}
                      onChange={(e) =>
                        setCustomCols((prev) => ({ ...prev, [h]: e.target.checked }))
                      }
                    />
                    {h}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Ação */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleImport}
              disabled={running || !pipelineId}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Importando… {progress}%
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> Importar {rows.length} leads
                </>
              )}
            </button>
          </div>

          {result && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900/40 dark:bg-emerald-900/20">
              <p className="flex items-center gap-2 font-medium text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> Importação concluída
              </p>
              <ul className="mt-2 space-y-0.5 text-emerald-800 dark:text-emerald-300">
                <li>Leads (cards) criados: <strong>{result.cardsCreated}</strong></li>
                <li>Leads existentes enriquecidos: <strong>{result.cardsUpdated}</strong></li>
                <li>Sem mudança (pulados): {result.cardsSkipped}</li>
                <li>Contatos novos: {result.contactsCreated} · atualizados: {result.contactsUpdated}</li>
                <li>Etapas criadas: {result.stagesCreated}</li>
              </ul>
              {result.errors.length > 0 && (
                <p className="mt-2 flex items-center gap-1 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  {result.errors.length} linha(s) com erro (veja o console/logs).
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
