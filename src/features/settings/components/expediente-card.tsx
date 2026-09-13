'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Clock, Plus, Trash2, Loader2, CalendarOff } from 'lucide-react';
import {
  businessHoursService,
  isOpenNow,
  DEFAULT_EXPEDIENTE,
  type BusinessHoursConfig,
  type ExpedienteSettings,
  type Holiday,
  type Weekday,
} from '@/features/settings/services/business-hours.service';
import { WEEKDAYS } from '@/features/ai-agents/services/ai-settings.service';

const TIMEZONES = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Bahia',
  'America/Fortaleza',
  'America/Recife',
  'America/Cuiaba',
  'America/Belem',
];

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-700'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export function ExpedienteCard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['expediente'],
    queryFn: () => businessHoursService.get(),
    staleTime: 60_000,
  });

  const [always247, setAlways247] = useState(true);
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [schedule, setSchedule] = useState<BusinessHoursConfig>(DEFAULT_EXPEDIENTE);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [outMsg, setOutMsg] = useState('');

  useEffect(() => {
    if (!data) return;
    setAlways247(data.businessHours247);
    setTimezone(data.businessTimezone);
    setSchedule(data.businessHoursSchedule ?? DEFAULT_EXPEDIENTE);
    setHolidays(data.businessHolidays ?? []);
    setOutMsg(data.businessOutOfHoursMessage ?? '');
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      businessHoursService.update({
        businessHours247: always247,
        businessTimezone: timezone,
        businessHoursSchedule: schedule,
        businessHolidays: holidays.filter((h) => h.date.trim()),
        businessOutOfHoursMessage: outMsg.trim() ? outMsg.trim() : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expediente'] });
      toast.success('Expediente salvo');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Erro ao salvar expediente';
      toast.error(msg);
    },
  });

  // Preview "aberto agora" — recalcula a cada minuto.
  const preview: ExpedienteSettings = useMemo(
    () => ({
      businessHours247: always247,
      businessTimezone: timezone,
      businessHoursSchedule: schedule,
      businessHolidays: holidays,
      businessOutOfHoursMessage: outMsg || null,
    }),
    [always247, timezone, schedule, holidays, outMsg],
  );
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const open = useMemo(() => isOpenNow(preview, new Date(nowTick)), [preview, nowTick]);

  const updateDay = (
    day: Weekday,
    patch: Partial<{ enabled: boolean; windows: Array<[string, string]> }>,
  ) =>
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        enabled: prev[day]?.enabled ?? false,
        windows: prev[day]?.windows ?? [],
        ...patch,
      },
    }));

  const addWindow = (day: Weekday) =>
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        enabled: prev[day]?.enabled ?? true,
        windows: [...(prev[day]?.windows ?? []), ['08:00', '17:30']],
      },
    }));

  const removeWindow = (day: Weekday, idx: number) =>
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        enabled: prev[day]?.enabled ?? false,
        windows: (prev[day]?.windows ?? []).filter((_, i) => i !== idx),
      },
    }));

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando expediente…
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-zinc-500" />
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Expediente
          </h2>
          <p className="text-xs text-zinc-500">
            Horário de funcionamento da empresa. É a fonte única usada por toda
            regra de horário: atendimento da IA, watchdog, salesbots (&quot;só
            em horário comercial&quot;) e as métricas de tempo de resposta.
          </p>
        </div>
      </div>

      {/* 24/7 + fuso + preview */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Aberto 24 horas / 7 dias
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {always247
                ? 'Sempre dentro do horário — nenhuma regra é limitada por horário.'
                : 'Defina abaixo os dias e faixas em que a empresa atende.'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                open
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  open ? 'bg-emerald-500' : 'bg-zinc-400'
                }`}
              />
              {open ? 'Aberto agora' : 'Fechado agora'}
            </span>
            <Toggle checked={always247} onChange={setAlways247} />
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>

        {always247 ? null : (
          <div className="mt-4 space-y-2">
            {WEEKDAYS.map(({ key, label }) => {
              const day = schedule[key] ?? { enabled: false, windows: [] };
              return (
                <div
                  key={key}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50/40 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/40"
                >
                  <label className="flex w-24 cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={day.enabled}
                      onChange={(e) => updateDay(key, { enabled: e.target.checked })}
                      className="h-3.5 w-3.5 rounded border-zinc-300"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      {label}
                    </span>
                  </label>

                  {day.enabled ? (
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      {(day.windows ?? []).map(([from, to], i) => (
                        <div key={i} className="flex items-center gap-1">
                          <input
                            type="time"
                            value={from}
                            onChange={(e) => {
                              const updated = [...(day.windows ?? [])];
                              updated[i] = [e.target.value, to];
                              updateDay(key, { windows: updated });
                            }}
                            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                          />
                          <span className="text-xs text-zinc-400">até</span>
                          <input
                            type="time"
                            value={to}
                            onChange={(e) => {
                              const updated = [...(day.windows ?? [])];
                              updated[i] = [from, e.target.value];
                              updateDay(key, { windows: updated });
                            }}
                            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                          />
                          <button
                            type="button"
                            onClick={() => removeWindow(key, i)}
                            className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addWindow(key)}
                        className="inline-flex items-center gap-1 rounded-md border border-dashed border-zinc-300 px-2 py-1 text-[11px] text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      >
                        <Plus className="h-3 w-3" /> Faixa
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-400">Fechado</span>
                  )}
                </div>
              );
            })}
            <p className="pt-1 text-[11px] text-zinc-400">
              Dica: adicione duas faixas no mesmo dia para fechar no almoço (ex.:
              08:00–12:00 e 13:30–17:30).
            </p>
          </div>
        )}
      </section>

      {/* Feriados */}
      {always247 ? null : (
        <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <CalendarOff className="h-4 w-4 text-zinc-500" />
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Feriados (dias fechados)
            </p>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">
            Datas em que a empresa não atende. Marque &quot;todo ano&quot; para
            repetir a mesma data anualmente.
          </p>
          <div className="mt-3 space-y-2">
            {holidays.map((h, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={h.date.length === 5 ? '' : h.date}
                  onChange={(e) =>
                    setHolidays((arr) =>
                      arr.map((x, idx) =>
                        idx === i ? { ...x, date: e.target.value } : x,
                      ),
                    )
                  }
                  className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
                <input
                  value={h.label ?? ''}
                  placeholder="Descrição (ex.: Natal)"
                  onChange={(e) =>
                    setHolidays((arr) =>
                      arr.map((x, idx) =>
                        idx === i ? { ...x, label: e.target.value } : x,
                      ),
                    )
                  }
                  className="flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
                <label className="flex cursor-pointer items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={!!h.annual}
                    onChange={(e) =>
                      setHolidays((arr) =>
                        arr.map((x, idx) =>
                          idx === i ? { ...x, annual: e.target.checked } : x,
                        ),
                      )
                    }
                    className="h-3.5 w-3.5 rounded border-zinc-300"
                  />
                  todo ano
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setHolidays((arr) => arr.filter((_, idx) => idx !== i))
                  }
                  className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setHolidays((arr) => [...arr, { date: '', label: '', annual: false }])
            }
            className="mt-2 inline-flex items-center gap-1 rounded-md border border-dashed border-zinc-300 px-2.5 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar feriado
          </button>
        </section>
      )}

      {/* Mensagem de fora de expediente */}
      <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Mensagem de fora de expediente (opcional)
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Texto padrão para avisar que está fora do horário. Fica guardado aqui
          para os salesbots reutilizarem. Vazio = sem mensagem.
        </p>
        <textarea
          value={outMsg}
          onChange={(e) => setOutMsg(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Olá! No momento estamos fora do horário de atendimento. Nosso expediente é de segunda a sexta, das 08h às 17h30. Retornamos no próximo horário para te ajudar."
          className="mt-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </section>

      <div className="mt-5">
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Salvar expediente
        </button>
      </div>
    </div>
  );
}
