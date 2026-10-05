'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { IdCard, Loader2, Sparkles } from 'lucide-react';
import {
  leadEnrichmentService,
  type Cadastro,
} from '../services/lead-enrichment.service';

const LABELS: Array<[keyof Cadastro, string]> = [
  ['name', 'Nome'],
  ['email', 'E-mail'],
  ['cpfCnpj', 'CPF/CNPJ'],
  ['birthDate', 'Nascimento'],
  ['cep', 'CEP'],
  ['estado', 'UF'],
  ['cidade', 'Cidade'],
  ['bairro', 'Bairro'],
  ['numero', 'Número'],
  ['complemento', 'Compl.'],
];

/** Endereço só com dígitos (ex.: um CEP) não é endereço — não exibe. */
const isJustCep = (v?: string) => !!v && /^\d{5}-?\d{3}$/.test(v.trim());

const fmtDoc = (v?: string) => {
  if (!v) return v;
  if (v.length === 11) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (v.length === 14) return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return v;
};
const fmtCep = (v?: string) =>
  v && v.length === 8 ? v.replace(/(\d{5})(\d{3})/, '$1-$2') : v;

/**
 * Dados de cadastro do lead (CPF, nascimento, endereço…) extraídos das
 * mensagens. Enriquecido automaticamente quando o lead envia os dados; o botão
 * reprocessa a conversa sob demanda.
 */
export function LeadCadastroPanel({ conversationId }: { conversationId: string }) {
  const qc = useQueryClient();
  const { data: cad } = useQuery({
    queryKey: ['lead-cadastro', conversationId],
    queryFn: () => leadEnrichmentService.getCadastro(conversationId),
    staleTime: 30_000,
  });

  const extractMut = useMutation({
    mutationFn: () => leadEnrichmentService.extract(conversationId),
    onSuccess: (r) => {
      toast.success(
        r.applied.length
          ? `${r.applied.length} campo(s) preenchido(s)`
          : 'Nada novo a extrair',
      );
      qc.setQueryData(['lead-cadastro', conversationId], r.cadastro);
      qc.invalidateQueries({ queryKey: ['conversation-cards', conversationId] });
    },
    onError: () => toast.error('Falha ao extrair os dados do lead'),
  });

  const rows = LABELS.filter(([k]) => cad?.[k]);
  const val = (k: keyof Cadastro) =>
    k === 'cpfCnpj' ? fmtDoc(cad?.[k]) : k === 'cep' ? fmtCep(cad?.[k]) : cad?.[k];
  // Endereço: estruturado (endereco) ou o texto cru; ignora quando é só um CEP.
  const endereco = [cad?.endereco, cad?.addressText].find(
    (v) => v && !isJustCep(v),
  );
  const hasAny = rows.length > 0 || !!endereco;

  return (
    <div className="rounded-lg border border-zinc-200 p-2.5 dark:border-zinc-800">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
          <IdCard className="h-3.5 w-3.5" /> Dados de cadastro
        </span>
        <button
          type="button"
          onClick={() => extractMut.mutate()}
          disabled={extractMut.isPending}
          title="Lê a conversa e preenche CPF, nascimento, endereço, e-mail… (só campos vazios)"
          className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/15 disabled:opacity-50"
        >
          {extractMut.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          Extrair
        </button>
      </div>
      {!hasAny ? (
        <p className="text-[11px] text-zinc-400">
          Sem dados ainda. Clique em “Extrair” para ler a conversa.
        </p>
      ) : (
        <dl className="space-y-0.5 text-[11px]">
          {rows.map(([k, label]) => (
            <div key={k} className="flex gap-2">
              <dt className="w-16 shrink-0 text-zinc-400">{label}</dt>
              <dd className="flex-1 break-words text-zinc-700 dark:text-zinc-200">
                {val(k)}
              </dd>
            </div>
          ))}
          {endereco && (
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-zinc-400">Endereço</dt>
              <dd className="flex-1 break-words text-zinc-700 dark:text-zinc-200">
                {endereco}
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
