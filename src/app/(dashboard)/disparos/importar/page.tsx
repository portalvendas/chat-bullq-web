'use client';

/** Importa contatos de CSV/XLSX (parse no cliente via SheetJS) + aplica tags. */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { tagsService } from '@/features/settings/services/tags.service';
import { disparosService } from '@/features/disparos/services/disparos.service';

let xlsxPromise: Promise<any> | null = null;
function loadXlsx(): Promise<any> {
  if ((window as any).XLSX) return Promise.resolve((window as any).XLSX);
  if (!xlsxPromise) {
    xlsxPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = () => resolve((window as any).XLSX);
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return xlsxPromise;
}

type Row = { name?: string; phone?: string; email?: string };

const pick = (obj: any, keys: string[]): string | undefined => {
  for (const k of Object.keys(obj)) {
    const norm = k.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (keys.some((kw) => norm.includes(kw))) {
      const v = obj[k];
      if (v != null && String(v).trim()) return String(v).trim();
    }
  }
  return undefined;
};

export default function ImportarContatosPage() {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [importId, setImportId] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsService.list(),
    staleTime: 60_000,
  });
  const { data: status } = useQuery({
    queryKey: ['disparos', 'import', importId],
    queryFn: () => disparosService.importStatus(importId!),
    enabled: !!importId,
    refetchInterval: (q) =>
      ['COMPLETED', 'FAILED'].includes((q.state.data as any)?.status) ? false : 2000,
  });

  const onFile = async (file: File) => {
    setParsing(true);
    setImportId(null);
    try {
      const XLSX = await loadXlsx();
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[];
      const mapped: Row[] = aoa
        .map((o) => ({
          name: pick(o, ['nome', 'name', 'contato', 'cliente']),
          phone: pick(o, ['telefone', 'phone', 'celular', 'whatsapp', 'fone', 'numero']),
          email: pick(o, ['email', 'e-mail', 'mail']),
        }))
        .filter((r) => r.phone);
      setFileName(file.name);
      setRows(mapped);
      if (!mapped.length) toast.error('Nenhuma linha com telefone encontrada.');
    } catch (e: any) {
      toast.error('Falha ao ler o arquivo.');
    } finally {
      setParsing(false);
    }
  };

  const submit = async () => {
    try {
      const res = await disparosService.importContacts({ fileName, rows, tagIds });
      setImportId(res.id);
      toast.success('Importação iniciada');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Falha ao importar');
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-5 p-4 sm:p-6">
      <Link href="/disparos" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800">
        <ArrowLeft className="h-4 w-4" /> Disparos
      </Link>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Importar contatos</h1>

      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700">
        {parsing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
        <span>{fileName || 'Escolher arquivo .xlsx / .csv'}</span>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </label>

      {rows.length > 0 && !importId && (
        <>
          <div className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-800/50">
            <strong>{rows.length}</strong> contato(s) com telefone detectado(s).
          </div>
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
              Aplicar tags (opcional)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(tags ?? []).map((t) => {
                const on = tagIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTagIds((p) => on ? p.filter((x) => x !== t.id) : [...p, t.id])}
                    className={`rounded-full border px-2 py-0.5 text-[11px] ${on ? 'border-primary bg-primary/10 text-primary' : 'border-zinc-300 text-zinc-500 dark:border-zinc-700'}`}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            onClick={submit}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Importar {rows.length} contato(s)
          </button>
        </>
      )}

      {status && (
        <div className="rounded-xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
          <div className="mb-2 flex items-center gap-2 font-medium">
            {status.status === 'COMPLETED' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
            )}
            {status.status}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Criados" value={status.createdCount} />
            <Stat label="Atualizados" value={status.updatedCount} />
            <Stat label="Ignorados" value={status.skippedCount} />
          </div>
          {status.status === 'COMPLETED' && (
            <Link href="/disparos/novo" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              Criar disparo com esses contatos →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-zinc-50 py-2 dark:bg-zinc-800/50">
      <div className="text-base font-semibold tabular-nums">{value ?? 0}</div>
      <div className="text-[10px] uppercase text-zinc-400">{label}</div>
    </div>
  );
}
