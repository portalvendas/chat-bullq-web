import { api } from '@/lib/api';
import type {
  BusinessHoursConfig,
  Weekday,
} from '@/features/ai-agents/services/ai-settings.service';

export type { BusinessHoursConfig, Weekday };

export interface Holiday {
  /** "YYYY-MM-DD" (data fixa) ou "MM-DD" (recorrente, com annual=true). */
  date: string;
  label?: string;
  annual?: boolean;
}

/** Expediente canônico da organização (fonte única de horário). */
export interface ExpedienteSettings {
  businessHours247: boolean;
  businessTimezone: string;
  businessHoursSchedule: BusinessHoursConfig | null;
  businessHolidays: Holiday[] | null;
  businessOutOfHoursMessage: string | null;
}

export type UpdateExpedienteInput = Partial<ExpedienteSettings>;

function unwrap<T>(data: unknown): T {
  return ((data as { data?: T })?.data ?? data) as T;
}

export const businessHoursService = {
  async get(): Promise<ExpedienteSettings> {
    const { data } = await api.get('/organizations/current');
    const o = unwrap<Record<string, unknown>>(data);
    return {
      businessHours247: (o.businessHours247 as boolean) ?? true,
      businessTimezone: (o.businessTimezone as string) || 'America/Sao_Paulo',
      businessHoursSchedule:
        (o.businessHoursSchedule as BusinessHoursConfig | null) ?? null,
      businessHolidays: (o.businessHolidays as Holiday[] | null) ?? null,
      businessOutOfHoursMessage:
        (o.businessOutOfHoursMessage as string | null) ?? null,
    };
  },

  async update(input: UpdateExpedienteInput): Promise<void> {
    await api.patch('/organizations/current', input);
  },
};

/** Template pronto (Seg–Sex 08:00–17:30) pra semear quando desligar o 24/7. */
export const DEFAULT_EXPEDIENTE: BusinessHoursConfig = {
  monday: { enabled: true, windows: [['08:00', '17:30']] },
  tuesday: { enabled: true, windows: [['08:00', '17:30']] },
  wednesday: { enabled: true, windows: [['08:00', '17:30']] },
  thursday: { enabled: true, windows: [['08:00', '17:30']] },
  friday: { enabled: true, windows: [['08:00', '17:30']] },
  saturday: { enabled: false, windows: [] },
  sunday: { enabled: false, windows: [] },
};

/**
 * "Aberto agora?" — espelho client-side do motor do backend, só pro preview
 * (24/7, agenda por dia no fuso da org, feriados fixos/anuais). Não é fonte
 * da verdade: o backend recalcula no envio.
 */
export function isOpenNow(cfg: ExpedienteSettings, at: Date = new Date()): boolean {
  if (cfg.businessHours247) return true;
  const schedule = cfg.businessHoursSchedule;
  if (!schedule || Object.keys(schedule).length === 0) return true;

  const tz = cfg.businessTimezone || 'America/Sao_Paulo';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(at);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const wdKey = (
    {
      Sun: 'sunday',
      Mon: 'monday',
      Tue: 'tuesday',
      Wed: 'wednesday',
      Thu: 'thursday',
      Fri: 'friday',
      Sat: 'saturday',
    } as Record<string, Weekday>
  )[map.weekday];

  // Feriado?
  const full = `${map.year}-${map.month}-${map.day}`;
  const mmdd = `${map.month}-${map.day}`;
  const isHoliday = (cfg.businessHolidays ?? []).some((h) => {
    const d = (h.date || '').replace(/^--/, '');
    if (d === full) return true;
    if ((h.annual || d.length <= 5) && d.slice(-5) === mmdd) return true;
    return false;
  });
  if (isHoliday) return false;

  const day = wdKey ? schedule[wdKey] : undefined;
  if (!day || !day.enabled) return false;
  const windows = day.windows ?? [];
  if (windows.length === 0) return true;

  let h = parseInt(map.hour, 10);
  if (h === 24) h = 0;
  const nowMin = h * 60 + parseInt(map.minute, 10);
  return windows.some(([from, to]) => {
    const toMin = (s: string) => {
      const [hh, mm] = s.split(':').map((v) => parseInt(v, 10));
      return (hh || 0) * 60 + (mm || 0);
    };
    return nowMin >= toMin(from) && nowMin < toMin(to);
  });
}
