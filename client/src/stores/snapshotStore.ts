import { create } from 'zustand';
import type { SnapshotSchedule, MetricSnapshot, SnapshotComparison } from '../lib/types';
import { snapshotsApi } from '../lib/api';

interface SnapshotStore {
  schedules: SnapshotSchedule[];
  snapshots: MetricSnapshot[];
  comparison: SnapshotComparison | null;
  loading: boolean;
  error: string | null;

  // Schedule actions
  fetchSchedules: () => Promise<void>;
  fetchScheduleForMetric: (metricId: number) => Promise<SnapshotSchedule | null>;
  createSchedule: (payload: { metric_pool_id: number; schedule_type: string; cron_expr?: string | null; retention_days?: number | null }) => Promise<SnapshotSchedule>;
  updateSchedule: (id: number, payload: { schedule_type?: string; cron_expr?: string | null; enabled?: boolean; retention_days?: number | null }) => Promise<SnapshotSchedule>;
  deleteSchedule: (id: number) => Promise<void>;

  // Snapshot actions
  fetchSnapshots: (metricId: number, params?: { period_type?: string; limit?: number }) => Promise<void>;
  takeSnapshot: (metricId: number) => Promise<MetricSnapshot>;
  deleteSnapshot: (metricId: number, snapshotId: number) => Promise<void>;
  compareSnapshots: (metricId: number, params: { period_type: string; current_key: string; previous_key: string }) => Promise<void>;

  clearComparison: () => void;
  setError: (error: string | null) => void;
}

export const useSnapshotStore = create<SnapshotStore>((set) => ({
  schedules: [],
  snapshots: [],
  comparison: null,
  loading: false,
  error: null,

  fetchSchedules: async () => {
    set({ loading: true, error: null });
    try {
      const schedules = await snapshotsApi.listSchedules();
      set({ schedules, loading: false });
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchScheduleForMetric: async (metricId) => {
    try {
      const schedule = await snapshotsApi.getSchedule(metricId);
      // Update in local list
      set((s) => {
        const exists = s.schedules.find((sc) => sc.id === schedule.id);
        if (exists) {
          return { schedules: s.schedules.map((sc) => sc.id === schedule.id ? schedule : sc) };
        }
        return { schedules: [...s.schedules, schedule] };
      });
      return schedule;
    } catch {
      return null;
    }
  },

  createSchedule: async (payload) => {
    set({ loading: true, error: null });
    try {
      const schedule = await snapshotsApi.createSchedule(payload);
      set((s) => ({ schedules: [...s.schedules, schedule], loading: false }));
      return schedule;
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },

  updateSchedule: async (id, payload) => {
    set({ loading: true, error: null });
    try {
      const schedule = await snapshotsApi.updateSchedule(id, payload);
      set((s) => ({
        schedules: s.schedules.map((sc) => sc.id === id ? schedule : sc),
        loading: false,
      }));
      return schedule;
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },

  deleteSchedule: async (id) => {
    set({ loading: true, error: null });
    try {
      await snapshotsApi.deleteSchedule(id);
      set((s) => ({
        schedules: s.schedules.filter((sc) => sc.id !== id),
        loading: false,
      }));
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },

  fetchSnapshots: async (metricId, params) => {
    set({ loading: true, error: null });
    try {
      const snapshots = await snapshotsApi.listSnapshots(metricId, params);
      set({ snapshots, loading: false });
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  takeSnapshot: async (metricId) => {
    set({ loading: true, error: null });
    try {
      const snapshot = await snapshotsApi.takeSnapshot(metricId);
      set((s) => ({ snapshots: [snapshot, ...s.snapshots], loading: false }));
      return snapshot;
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },

  deleteSnapshot: async (metricId, snapshotId) => {
    set({ loading: true, error: null });
    try {
      await snapshotsApi.deleteSnapshot(metricId, snapshotId);
      set((s) => ({
        snapshots: s.snapshots.filter((sn) => sn.id !== snapshotId),
        loading: false,
      }));
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },

  compareSnapshots: async (metricId, params) => {
    set({ loading: true, error: null });
    try {
      const comparison = await snapshotsApi.compare(metricId, params);
      set({ comparison, loading: false });
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  clearComparison: () => set({ comparison: null }),
  setError: (error) => set({ error }),
}));
