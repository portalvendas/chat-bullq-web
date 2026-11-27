'use client';

import { useState } from 'react';
import { Check, ChevronDown, Filter } from 'lucide-react';

export interface LeadSourceOption {
  name: string;
  count: number;
}

/**
 * Filtro multi-seleção "Fonte do lead" do Funil de vendas. Opções = fontes
 * presentes nos cards do período (com contagem), na MESMA classificação do
 * filtro por canal de Pedidos & Orçamentos (Google, Meta Ads, Instagram,
 * Facebook (formulário), Anúncio Meta → WhatsApp, WhatsApp direto…).
 * Vazio = todas as fontes.
 */
export function LeadSourceFilter({
  options,
  value,
  onChange,
}: {
  options: LeadSourceOption[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  // Fonte selecionada que sumiu do período continua listada (com 0) p/ desmarcar.
  const all: LeadSourceOption[] = [
    ...options,
    ...value.filter((v) => !options.some((o) => o.name === v)).map((name) => ({ name, count: 0 })),
  ];
  const label =
    value.length === 0 ? 'Todas as fontes' : value.length === 1 ? value[0] : `${value.length} fontes`;
  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Filtrar cards pela fonte de tráfego do lead"
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
          value.length
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
        }`}
      >
        <Filter className="h-3.5 w-3.5" />
        <span className="max-w-[10rem] truncate">{label}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-hidden
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div className="absolute left-0 z-40 mt-1 max-h-80 w-64 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => onChange([])}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Todas as fontes
              {value.length === 0 && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
            <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
            {all.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-zinc-400">Nenhum lead no período.</p>
            )}
            {all.map((opt) => {
              const on = value.includes(opt.name);
              return (
                <button
                  key={opt.name}
                  type="button"
                  onClick={() => toggle(opt.name)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <span
                    className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                      on ? 'border-primary bg-primary text-primary-foreground' : 'border-zinc-300 dark:border-zinc-600'
                    }`}
                  >
                    {on && <Check className="h-3 w-3" />}
                  </span>
                  <span className="flex-1 truncate">{opt.name}</span>
                  <span className="tabular-nums text-zinc-400">{opt.count}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
