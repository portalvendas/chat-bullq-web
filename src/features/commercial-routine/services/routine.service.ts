import { api } from '@/lib/api';

export interface RoutineStageRef {
  id: string;
  name: string;
  pipelineId: string | null;
}

export interface RoutineStepToday {
  key: string;
  label: string;
  guidance: string;
  order: number;
  metric: 'no_inbound' | 'has_inbound' | 'all';
  total: number;
  pending: number;
  parados: number;
  thresholdHours: number;
  requireCheck: boolean;
  checked: boolean;
  done: boolean;
  stageIds: string[];
  stages: RoutineStageRef[];
}

export interface RoutineToday {
  day: string;
  enabled: boolean;
  steps: RoutineStepToday[];
  summary: {
    stepsTotal: number;
    stepsDone: number;
    totalPending: number;
    totalParados: number;
    firstPendingKey: string | null;
    allDone: boolean;
  };
}

export interface RoutineStepConfig {
  key: string;
  label: string;
  guidance: string;
  metric: string;
  stageIds: string[];
  thresholdHours: number;
  requireCheck: boolean;
}
export interface RoutineConfig {
  enabled: boolean;
  userMode: 'ALL' | 'SELECTED';
  userIds: string[];
  ignoreAssignment: boolean;
  steps: RoutineStepConfig[];
}

export interface RoutineOptions {
  pipelines: Array<{
    id: string;
    name: string;
    stages: Array<{ id: string; name: string }>;
  }>;
}

function unwrap<T>(data: any): T {
  return (data?.data ?? data) as T;
}

export const routineService = {
  async today(): Promise<RoutineToday> {
    const { data } = await api.get('/commercial-routine/today');
    return unwrap<RoutineToday>(data);
  },
  async check(stepKey: string, done: boolean): Promise<RoutineToday> {
    const { data } = await api.post('/commercial-routine/check', {
      stepKey,
      done,
    });
    return unwrap<RoutineToday>(data);
  },
  async getConfig(): Promise<RoutineConfig> {
    const { data } = await api.get('/commercial-routine/config');
    return unwrap<RoutineConfig>(data);
  },
  async options(): Promise<RoutineOptions> {
    const { data } = await api.get('/commercial-routine/options');
    return unwrap<RoutineOptions>(data);
  },
  async updateConfig(dto: {
    enabled?: boolean;
    userMode?: 'ALL' | 'SELECTED';
    userIds?: string[];
    ignoreAssignment?: boolean;
    steps?: Array<{
      key: string;
      stageIds: string[];
      thresholdHours: number;
      requireCheck: boolean;
    }>;
  }): Promise<RoutineConfig> {
    const { data } = await api.put('/commercial-routine/config', dto);
    return unwrap<RoutineConfig>(data);
  },
};
