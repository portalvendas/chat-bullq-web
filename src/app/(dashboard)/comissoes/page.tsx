'use client';

/**
 * Comissões por vendedor — EXCLUSIVO DO DONO (OWNER). Vendedoras e admins não
 * veem o menu nem a tela (e a API recusa com 403).
 *
 * Regra por vendedor: valor fixo até bater a meta; depois da meta, % sobre o
 * vendido (só o excedente ou o total, configurável), mantendo ou não o fixo.
 * Base = pedidos de venda direta do Tiny no mês, SÓ PRODUTOS (sem frete).
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle,
  BadgeDollarSign,
  Download,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import {
  commissionsService,
  type CommissionPlan,
  type CommissionRow,
  type PercentBase,
} from '@/features/commissions/services/commissions.service';

const brl = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (v: number | null | undefined) =>
  v == null ? '—' : `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

/** "1.500,50" / "1500,5" / "1500.5" / "1500" → número. */
function parseMoney(s: string): number {
  const t = String(s ?? '').trim();
  if (!t) return 0;
  const n = t.includes(',') ? Number(t.replace(/\./g, '').replace(',', '.')) : Number(t);
  return Number.isFinite(n) ? n : NaN;
}

function currentMonth(): string {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Texto da regra em português, para conferência. */
function ruleText(r: { fixedAmount: number; goalAmount: number; percent: number; percentBase: PercentBase; keepFixed: boolean }) {
  const base = r.percentBase === 'TOTAL' ? 'sobre todo o valor vendido' : 'sobre o que passar da meta';
  const fixo = r.keepFixed ? `${brl(r.fixedAmount)} + ` : '';
  return `Até ${brl(r.goalAmount)}: ${brl(r.fixedAmount)} fixo. Bateu a meta: ${fixo}${r.percent}% ${base}.`;
}

export default function ComissoesPage() {
  const { organizations, activeOrgId } = useAuthStore();
  const role = organizations.find((o) => o.id === activeOrgId)?.role;

  if (role !== 'OWNER') {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <ShieldAlert className="mx-auto h-8 w-8 text-zinc-300" />
          <h1 className="mt-3 text-base font-semibold text-zinc-800 dark:text-zinc-100">Acesso restrito</h1>
          <p className="mt-1 text-sm text-zinc-500">As comissões estão disponíveis apenas para o dono da conta.</p>
        </div>
      </div>
    );
  }
  return <Comissoes />;
}

function Comissoes() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(currentMonth());
  const [editing, setEditing] = useState<Partial<CommissionPlan> | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data: plans } = useQuery({ queryKey: ['commission-plans'], queryFn: () => commissionsService.plans() });
  const { data: rep, isLoading } = useQuery({
    queryKey: ['commission-report', month],
    queryFn: () => commissionsService.report(month),
    placeholderData: (p) => p,
  });

  const refresh = useMutation({
    mutationFn: () => commissionsService.refreshFreight(month),
    onSuccess: (r) => {
      toast.success(`Frete lido de ${r.checked} pedido(s)${r.failed ? ` · ${r.failed} falharam` : ''}`);
      qc.invalidateQueries({ queryKey: ['commission-report'] });
    },
    onError: () => toast.error('Falha ao buscar os fretes no Tiny'),
  });

  const saveGoal = useMutation({
    mutationFn: (v: { vendedor: string; goal: number | null }) => commissionsService.setGoal(v.vendedor, month, v.goal),
    onSuccess: () => {
      toast.success('Meta do mês salva');
      qc.invalidateQueries({ queryKey: ['commission-report'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Não foi possível salvar a meta'),
  });

  const removePlan = useMutation({
    mutationFn: (id: string) => commissionsService.deletePlan(id),
    onSuccess: () => {
      toast.success('Regra removida');
      qc.invalidateQueries({ queryKey: ['commission-plans'] });
      qc.invalidateQueries({ queryKey: ['commission-report'] });
    },
  });

  async function handleExport() {
    try {
      setExporting(true);
      const blob = await commissionsService.exportXlsx(month);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comissoes_${month}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Falha ao exportar');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
        {/* Cabeçalho */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              <BadgeDollarSign className="h-6 w-6 text-primary" /> Comissões
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Pedidos de venda direta do Tiny, só produtos (sem frete). Visível apenas para o dono da conta.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="month"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <button
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending}
              title="Busca no Tiny o frete dos pedidos do mês ainda não apurados (até 120 por vez)"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {refresh.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Atualizar fretes
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Exportar Excel
            </button>
          </div>
        </div>

        {/* Totais */}
        {rep && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Pedidos" value={String(rep.totais.pedidos)} />
            <Kpi label="Vendas sem frete" value={brl(rep.totais.vendas)} hint={`Bruto ${brl(rep.totais.bruto)} · frete ${brl(rep.totais.frete)}`} />
            <Kpi label="Comissões do mês" value={brl(rep.totais.comissao)} strong />
            <Kpi
              label="Custo de comissão"
              value={rep.totais.vendas > 0 ? pct(rep.totais.comissao / rep.totais.vendas) : '—'}
              hint="Comissões ÷ vendas sem frete"
            />
          </div>
        )}

        {rep && rep.totais.fretePendente > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <b>{rep.totais.fretePendente} pedido(s)</b> ainda sem frete lido do Tiny — entram pelo valor cheio. O sync
              completa sozinho aos poucos; para fechar o mês agora, clique em <b>Atualizar fretes</b>.
            </span>
          </div>
        )}

        {/* Apuração */}
        <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-800 dark:border-zinc-800 dark:text-zinc-100">
            Apuração de {month.split('-').reverse().join('/')}
          </div>
          {isLoading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" /> calculando…
            </div>
          ) : !rep || rep.rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-400">Nenhuma venda nem regra para este mês.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wide text-zinc-400">
                  <tr>
                    <th className="px-4 py-2 font-medium">Vendedor</th>
                    <th className="px-2 py-2 text-right font-medium">Pedidos</th>
                    <th className="px-2 py-2 text-right font-medium">Vendas s/ frete</th>
                    <th className="px-2 py-2 text-right font-medium">Meta do mês</th>
                    <th className="px-2 py-2 font-medium">Atingimento</th>
                    <th className="px-2 py-2 text-right font-medium">Fixo</th>
                    <th className="px-2 py-2 text-right font-medium">Variável</th>
                    <th className="px-4 py-2 text-right font-medium">Comissão</th>
                  </tr>
                </thead>
                <tbody>
                  {rep.rows.map((r) => (
                    <ReportRow
                      key={r.vendedor}
                      r={r}
                      onGoal={(goal) => saveGoal.mutate({ vendedor: r.vendedor, goal })}
                      onCreateRule={() => setEditing({ vendedor: r.vendedor })}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Regras */}
        <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Regras por vendedor</span>
            <button
              onClick={() => setEditing({ percentBase: 'EXCEDENTE', keepFixed: true, active: true })}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" /> Nova regra
            </button>
          </div>
          {(plans?.plans ?? []).length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-400">Nenhuma regra cadastrada.</div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {plans!.plans.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-800 dark:text-zinc-100">{p.vendedor}</span>
                      {!p.active && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800">inativa</span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">{ruleText(p)}</p>
                    {p.notes && <p className="text-[11px] text-zinc-400">{p.notes}</p>}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setEditing(p)}
                      className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                    >
                      <Pencil className="h-3 w-3" /> Editar
                    </button>
                    <button
                      onClick={() => confirm(`Remover a regra de ${p.vendedor}?`) && removePlan.mutate(p.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-zinc-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {editing && (
        <PlanForm
          initial={editing}
          vendedores={plans?.vendedores ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ['commission-plans'] });
            qc.invalidateQueries({ queryKey: ['commission-report'] });
          }}
        />
      )}
    </div>
  );
}

function Kpi({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${strong ? 'text-primary' : 'text-zinc-900 dark:text-zinc-100'}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-zinc-400">{hint}</div>}
    </div>
  );
}

function ReportRow({
  r,
  onGoal,
  onCreateRule,
}: {
  r: CommissionRow;
  onGoal: (goal: number | null) => void;
  onCreateRule: () => void;
}) {
  const [goalTxt, setGoalTxt] = useState<string | null>(null);
  const c = r.calc;
  const ating = c?.atingimento ?? null;
  const bar = Math.min(100, Math.round((ating ?? 0) * 100));
  return (
    <tr className="border-t border-zinc-100 dark:border-zinc-800">
      <td className="px-4 py-2.5">
        <div className="font-medium text-zinc-800 dark:text-zinc-100">{r.vendedor}</div>
        {r.fretePendente > 0 && <div className="text-[11px] text-amber-600">{r.fretePendente} sem frete apurado</div>}
      </td>
      <td className="px-2 py-2.5 text-right tabular-nums">{r.pedidos}</td>
      <td className="px-2 py-2.5 text-right tabular-nums">{brl(r.vendas)}</td>
      <td className="px-2 py-2.5 text-right">
        {c ? (
          goalTxt != null ? (
            <input
              autoFocus
              value={goalTxt}
              onChange={(e) => setGoalTxt(e.target.value)}
              onBlur={() => {
                const t = goalTxt.trim();
                setGoalTxt(null);
                if (t === '') return onGoal(null);
                const n = parseMoney(t);
                if (Number.isFinite(n) && n >= 0 && n !== c.meta) onGoal(n);
              }}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              placeholder="vazio = meta padrão"
              className="w-28 rounded border border-zinc-300 px-1.5 py-0.5 text-right text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          ) : (
            <button
              onClick={() => setGoalTxt(String(c.meta))}
              title={r.metaDoMes != null ? 'Meta própria deste mês — clique para alterar' : 'Meta padrão da regra — clique para definir uma meta só deste mês'}
              className="tabular-nums hover:underline"
            >
              {brl(c.meta)}
              {r.metaDoMes != null && <span className="ml-1 text-[10px] text-primary">mês</span>}
            </button>
          )
        ) : (
          <span className="text-zinc-400">—</span>
        )}
      </td>
      <td className="px-2 py-2.5">
        {c ? (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div className={`h-full ${c.bateuMeta ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${bar}%` }} />
            </div>
            <span className={`text-xs tabular-nums ${c.bateuMeta ? 'text-emerald-600' : 'text-zinc-500'}`}>{pct(ating)}</span>
          </div>
        ) : null}
      </td>
      <td className="px-2 py-2.5 text-right tabular-nums">{c ? brl(c.fixo) : ''}</td>
      <td className="px-2 py-2.5 text-right tabular-nums">{c ? brl(c.variavel) : ''}</td>
      <td className="px-4 py-2.5 text-right">
        {c ? (
          <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{brl(c.total)}</span>
        ) : r.temRegra ? (
          <span className="text-xs text-zinc-400">regra inativa</span>
        ) : r.vendedor === 'Sem vendedor' ? (
          <span className="text-xs text-zinc-400">sem vendedor no pedido</span>
        ) : (
          <button onClick={onCreateRule} className="text-xs font-medium text-primary hover:underline">
            + criar regra
          </button>
        )}
      </td>
    </tr>
  );
}

function PlanForm({
  initial,
  vendedores,
  onClose,
  onSaved,
}: {
  initial: Partial<CommissionPlan>;
  vendedores: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    vendedor: initial.vendedor ?? '',
    fixedAmount: String(initial.fixedAmount ?? ''),
    goalAmount: String(initial.goalAmount ?? ''),
    percent: String(initial.percent ?? ''),
    percentBase: (initial.percentBase ?? 'EXCEDENTE') as PercentBase,
    keepFixed: initial.keepFixed ?? true,
    active: initial.active ?? true,
    notes: initial.notes ?? '',
  });
  const isEdit = !!initial.id;
  const toNum = (s: string) => parseMoney(s) || 0;
  const rule = {
    fixedAmount: toNum(f.fixedAmount),
    goalAmount: toNum(f.goalAmount),
    percent: parseMoney(f.percent) || 0,
    percentBase: f.percentBase,
    keepFixed: f.keepFixed,
  };
  // Simulação rápida com 80% e 125% da meta.
  const sim = useMemo(() => {
    const calc = (v: number) => {
      if (v < rule.goalAmount) return rule.fixedAmount;
      const base = rule.percentBase === 'TOTAL' ? v : v - rule.goalAmount;
      return (rule.keepFixed ? rule.fixedAmount : 0) + (base * rule.percent) / 100;
    };
    const m = rule.goalAmount || 0;
    return [0.8, 1, 1.25].map((k) => ({ vendas: m * k, total: calc(m * k) }));
  }, [rule.fixedAmount, rule.goalAmount, rule.percent, rule.percentBase, rule.keepFixed]);

  const save = useMutation({
    mutationFn: () =>
      commissionsService.savePlan({
        vendedor: f.vendedor.trim(),
        ...rule,
        active: f.active,
        notes: f.notes || null,
      }),
    onSuccess: () => {
      toast.success('Regra salva');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Não foi possível salvar'),
  });

  const input =
    'w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {isEdit ? `Regra de ${initial.vendedor}` : 'Nova regra de comissão'}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Vendedor (como aparece nos pedidos do Tiny)
            <input
              list="vendedores-tiny"
              disabled={isEdit}
              value={f.vendedor}
              onChange={(e) => setF({ ...f, vendedor: e.target.value })}
              className={`${input} mt-1 disabled:opacity-60`}
            />
            <datalist id="vendedores-tiny">
              {vendedores.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Valor fixo (R$)
              <input inputMode="decimal" value={f.fixedAmount} onChange={(e) => setF({ ...f, fixedAmount: e.target.value })} className={`${input} mt-1`} />
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Meta mensal padrão (R$)
              <input inputMode="decimal" value={f.goalAmount} onChange={(e) => setF({ ...f, goalAmount: e.target.value })} className={`${input} mt-1`} />
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
              % após bater a meta
              <input inputMode="decimal" value={f.percent} onChange={(e) => setF({ ...f, percent: e.target.value })} className={`${input} mt-1`} />
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
              O % incide sobre
              <select
                value={f.percentBase}
                onChange={(e) => setF({ ...f, percentBase: e.target.value as PercentBase })}
                className={`${input} mt-1`}
              >
                <option value="EXCEDENTE">O que passar da meta</option>
                <option value="TOTAL">Todo o valor vendido no mês</option>
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
            <input type="checkbox" checked={f.keepFixed} onChange={(e) => setF({ ...f, keepFixed: e.target.checked })} />
            Ao bater a meta, manter o fixo e somar o %
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
            <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
            Regra ativa
          </label>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Observação
            <input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className={`${input} mt-1`} />
          </label>

          <div className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
            <div className="font-medium">{ruleText(rule)}</div>
            {rule.goalAmount > 0 && (
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {sim.map((s) => (
                  <div key={s.vendas}>
                    vendeu {brl(s.vendas)} → <b>{brl(s.total)}</b>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
            Cancelar
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || !f.vendedor.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
