'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Upload, ShoppingBag } from 'lucide-react';
import {
  mlDirectoryService,
  type MlDirectory,
} from '@/features/ai-agents/services/ml-directory.service';

export default function OrganizadoresPage() {
  const [text, setText] = useState('');
  const [dir, setDir] = useState<MlDirectory | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDir(await mlDirectoryService.get());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar diretório');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ''));
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!text.trim()) {
      toast.error('Cole a lista ou faça upload do arquivo primeiro');
      return;
    }
    setImporting(true);
    try {
      const res = await mlDirectoryService.import(text);
      toast.success(
        `Importado: ${res.imported} itens em ${res.categorias} categorias`,
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao importar');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          <ShoppingBag className="h-5 w-5" /> Diretório de organizadores
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Lista de largura da gaveta → anúncio, por categoria. A IA usa isso
          (skill <code>encontrar_organizador</code>) pra indicar o produto sob
          medida certo. Cole o conteúdo do arquivo ou faça upload e importe —
          isso substitui o diretório atual.
        </p>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Lista (formato: categoria, depois "código | largura" e o link)
          </label>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Upload className="h-3.5 w-3.5" /> Upload .txt
            </button>
          </div>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={'Colmeia MDF\n162 | 30\nhttps://produto.mercadolivre.com.br/MLB-....\n163 | 40\nhttps://...'}
          className="w-full resize-y rounded-md border border-zinc-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleImport}
            disabled={importing}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {importing && <Loader2 className="h-4 w-4 animate-spin" />}
            Importar
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Diretório atual{dir ? ` (${dir.total} itens)` : ''}
        </h3>
        {dir?.note && (
          <p className="mt-1 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            {dir.note}
          </p>
        )}
        {loading ? (
          <p className="mt-3 text-sm text-zinc-500">Carregando…</p>
        ) : !dir || dir.categorias.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            Nenhum item importado ainda.
          </p>
        ) : (
          <div className="mt-3 space-y-4">
            {dir.categorias.map((cat) => (
              <div key={cat.categoria}>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {cat.categoria}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {cat.itens.map((it) => (
                    <a
                      key={`${cat.categoria}-${it.larguraCm}`}
                      href={it.url}
                      target="_blank"
                      rel="noreferrer"
                      title={it.mlb}
                      className="rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] text-zinc-600 hover:border-primary hover:text-primary dark:border-zinc-700 dark:text-zinc-300"
                    >
                      {it.larguraCm} cm
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
