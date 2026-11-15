'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Plus, Loader2, Clock } from 'lucide-react';
import { funnelAuditService } from '../services/funnel-audit.service';

const DIAS = [
  { v: 1, l: 'Seg' },
  { v: 2, l: 'Ter' },
  { v: 3, l: 'Qua' },
  { v: 4, l: 'Qui' },
  { v: 5, l: 'Sex' },
  { v: 6, l: 'Sáb' },
  { v: 0, l: 'Dom' },
];

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Modal de agendamento automático da Auditoria de Funil (por empresa). */
export function ScheduleConfigModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['funnel-audit-config'],
    queryFn: () => funnelAuditService.getConfig(),
    enabled: open,
  });

  const [auto, setAuto] = useState(true);
  const [times, setTimes] = useState<string[]>([]);
  const [days, setDays] = useState<number[]>([]);
  const [newTime, setNewTime] = useState('');

  useEffect(() => {
    if (data) {
      setAuto(data.autoEnabled);
      setTimes(data.times);
      setDays(data.weekdays);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      funnelAuditService.setConfig({
        autoEnabled: auto,
        times,
        weekdays: days,
      }),
    onSuccess: () => {
      toast.success('Agendamento salvo');
      qc.invalidateQueries({ queryKey: ['funnel-audit-config'] });
      onClose();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? 'Erro ao salvar'),
  });

  const addTime = () => {
    const t = newTime.trim();
    if (!HHMM.test(t)) return;
    if (!times.includes(t)) setTimes([...times, t].sort());
    setNewTime('');
  };
  const toggleDay = (v: number) =>
    setDays((d) =>
      d.includes(v) ? d.filter((x) => x !== v) : [...d, v].sort((a, b) => a - b),
    );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Agendamento da auditoria
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Execução automática
                </span>
                <button
                  type="button"
                  onClick={() => setAuto((a) => !a)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${auto ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${auto ? 'left-[22px]' : 'left-0.5'}`}
                  />
                </button>
              </label>
              <p className="mt-1 text-xs text-zinc-500">
                Desligado, a auditoria só roda quando você clicar em “Auditar
                funil”.
              </p>
            </div>

            <div className={auto ? '' : 'pointer-events-none opacity-50'}>
              <div className="mb-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Horários (fuso de São Paulo)
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {times.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    <Clock className="h-3 w-3 text-zinc-400" /> {t}
                    <button
                      type="button"
                      onClick={() => setTimes(times.filter((x) => x !== t))}
                      className="text-zinc-400 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTime())}
                  className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={addTime}
                  className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
              {times.length === 0 && (
                <p className="mt-1 text-[11px] text-amber-600">
                  Sem horários → não roda automático.
                </p>
              )}
            </div>

            <div className={auto ? '' : 'pointer-events-none opacity-50'}>
              <div className="mb-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Dias da semana
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DIAS.map((d) => (
                  <button
                    key={d.v}
                    type="button"
                    onClick={() => toggleDay(d.v)}
                    className={`h-8 w-12 rounded-md border text-xs font-medium ${days.includes(d.v) ? 'border-primary bg-primary/10 text-primary' : 'border-zinc-200 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400'}`}
                  >
                    {d.l}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={onClose}
                className="rounded-md px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Salvar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
