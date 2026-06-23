import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  add: (type: ToastType, message: string, duration?: number) => number;
  remove: (id: number) => void;
}

let counter = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  add: (type, message, duration = 3500) => {
    const id = ++counter;
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    if (duration > 0) {
      setTimeout(() => get().remove(id), duration);
    }
    return id;
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// Imperative helper usable from anywhere — components, Zustand stores, or the
// API layer — without needing a hook. Errors stay on screen a bit longer.
export const toast = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().add('success', message, duration),
  error: (message: string, duration?: number) =>
    useToastStore.getState().add('error', message, duration ?? 5000),
  info: (message: string, duration?: number) =>
    useToastStore.getState().add('info', message, duration),
};
