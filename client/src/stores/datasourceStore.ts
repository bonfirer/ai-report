import { create } from 'zustand';
import type { DataSource, SchemaInfo } from '../lib/types';

export type { DataSource, SchemaInfo };

interface DataSourceStore {
  sources: DataSource[];
  selectedId: number | null;
  loading: boolean;
  error: string | null;
  setSources: (sources: DataSource[]) => void;
  addSource: (source: DataSource) => void;
  removeSource: (id: number) => void;
  updateSource: (id: number, updates: Partial<DataSource>) => void;
  selectSource: (id: number | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useDataSourceStore = create<DataSourceStore>((set) => ({
  sources: [],
  selectedId: null,
  loading: false,
  error: null,
  setSources: (sources) => set({ sources }),
  addSource: (source) => set((s) => ({ sources: [...s.sources, source] })),
  removeSource: (id) =>
    set((s) => ({
      sources: s.sources.filter((src) => src.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),
  updateSource: (id, updates) =>
    set((s) => ({
      sources: s.sources.map((src) =>
        src.id === id ? { ...src, ...updates } : src
      ),
    })),
  selectSource: (id) => set({ selectedId: id }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
