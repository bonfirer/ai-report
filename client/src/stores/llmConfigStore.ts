import { create } from 'zustand';
import type { LLMConfig } from '../lib/types';

export type { LLMConfig };

export type LLMStatus = 'unconfigured' | 'configured' | 'testing' | 'connected' | 'error';

interface LLMConfigStore {
  config: LLMConfig | null;
  status: LLMStatus;
  setConfig: (config: LLMConfig) => void;
  setStatus: (status: LLMStatus) => void;
  isConfigured: () => boolean;
}

export const useLLMConfigStore = create<LLMConfigStore>((set, get) => ({
  config: null,
  status: 'unconfigured',
  setConfig: (config) => set({ config, status: 'configured' }),
  setStatus: (status) => set({ status }),
  isConfigured: () => get().status === 'connected' || get().status === 'configured',
}));
