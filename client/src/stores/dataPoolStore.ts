import { create } from 'zustand';
import type { DataPool } from '../lib/types';

// Re-export the shared type
export type { DataPool };

/// UI-aware pool entry — adds `selected` state for the checkbox UI
export interface UIDataPool {
  id: number;
  name: string;
  sql_query: string;
  datasource_id: number;
  row_count: number;
  selected: boolean;
}

interface DataPoolStore {
  pools: UIDataPool[];
  setPools: (pools: UIDataPool[]) => void;
  addPool: (pool: UIDataPool) => void;
  togglePool: (id: number) => void;
  selectAll: () => void;
  deselectAll: () => void;
  getSelected: () => UIDataPool[];
  clearPools: () => void;
}

export const useDataPoolStore = create<DataPoolStore>((set, get) => ({
  pools: [],
  setPools: (pools) => set({ pools }),
  addPool: (pool) => set((s) => ({ pools: [...s.pools, pool] })),
  togglePool: (id) =>
    set((s) => ({
      pools: s.pools.map((p) =>
        p.id === id ? { ...p, selected: !p.selected } : p
      ),
    })),
  selectAll: () =>
    set((s) => ({
      pools: s.pools.map((p) => ({ ...p, selected: true })),
    })),
  deselectAll: () =>
    set((s) => ({
      pools: s.pools.map((p) => ({ ...p, selected: false })),
    })),
  getSelected: () => get().pools.filter((p) => p.selected),
  clearPools: () => set({ pools: [] }),
}));
