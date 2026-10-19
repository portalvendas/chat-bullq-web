import { api } from '@/lib/api';

export type ActivityState = 'background' | 'idle' | 'active';

export interface SellerDayRow {
  day: string;
  startMin: number | null;
  endMin: number | null;
  activeMinutes: number;
  idleMinutes: number;
  talkMinutes: number;
  messagesCrm: number;
  messagesPhone: number;
  conversations: number;
}

export interface SellerDailyRow {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  /** Dias do período com atividade. */
  days: number;
  /** Início/fim médios por dia trabalhado (minutos desde 00:00 local). */
  avgStartMin: number | null;
  avgEndMin: number | null;
  dayEnd: string | null;
  perDay: SellerDayRow[];
  presence: {
    firstSeen: string | null;
    firstActive: string | null;
    lastActive: string | null;
    lastSeen: string | null;
    activeMinutes: number;
    idleMinutes: number;
    backgroundMinutes: number;
    conversationMinutes: number;
    longestBreakMinutes: number;
    areas: { area: string; minutes: number }[];
  };
  service: {
    messagesCrm: number;
    messagesPhone: number;
    conversations: number;
    talkMinutes: number;
    firstMessageAt: string | null;
    lastMessageAt: string | null;
    responses: number;
    responseMedianSec: number | null;
    respondedWithin15: number;
    pendingNow: number | null;
  };
  funnel: { cardsMoved: number; newLeads: number; won: number; lost: number };
  sales: { quotes: number; quotesValue: number; orders: number; ordersValue: number };
  routine: { active: boolean; checked: number; total: number };
  dayStart: string | null;
  hasActivity: boolean;
}

export interface ProductivityDaily {
  from: string;
  to: string;
  day: string;
  calendarDays: number;
  singleDay: boolean;
  includesToday: boolean;
  clamped: boolean;
  timezone: string;
  isToday: boolean;
  generatedAt: string;
  totals: {
    activeSellers: number;
    activeMinutes: number;
    talkMinutes: number;
    messages: number;
    conversations: number;
    cardsMoved: number;
    quotes: number;
    quotesValue: number;
    orders: number;
    ordersValue: number;
  };
  users: SellerDailyRow[];
  unmappedSellers: string[];
}

export interface ProductivityTimeline {
  day: string;
  timezone: string;
  user: { id: string; name: string };
  segments: { start: string; end: string; state: 'background' | 'idle' | 'active' }[];
  hourly: { hour: number; crm: number; phone: number }[];
  cardEvents: {
    at: string;
    type: string;
    cardId: string;
    cardTitle: string | null;
    fromStage: string | null;
    toStage: string | null;
  }[];
}

export interface ProductivityMe {
  day: string;
  timezone: string;
  isToday: boolean;
  generatedAt: string;
  me: SellerDailyRow;
  timeline: Pick<ProductivityTimeline, 'segments' | 'hourly' | 'cardEvents'>;
}

export const productivityService = {
  /** Indicador individual do usuário logado (dashboard dele). */
  me: async (day?: string): Promise<ProductivityMe> => {
    const { data } = await api.get('/productivity/me', { params: day ? { day } : {} });
    return data?.data ?? data;
  },

  heartbeat: (body: { state: ActivityState; area?: string; conversationId?: string }) =>
    api.post('/productivity/heartbeat', body),

  daily: async (range: { from: string; to: string }): Promise<ProductivityDaily> => {
    const { data } = await api.get('/productivity/daily', { params: range });
    return data?.data ?? data;
  },

  timeline: async (userId: string, day?: string): Promise<ProductivityTimeline> => {
    const { data } = await api.get('/productivity/timeline', {
      params: { userId, ...(day ? { day } : {}) },
    });
    return data?.data ?? data;
  },
};
