import { writable } from 'svelte/store'

export type Toast = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

const toastsStore = writable<Toast[]>([])

export const toasts = {
  subscribe: toastsStore.subscribe,
  show(message: string, type: 'success' | 'error' | 'info' = 'success', duration = 3000) {
    const id = Math.random().toString(36).substring(2, 9);
    toastsStore.update(list => [...list, { id, message, type, duration }]);
    setTimeout(() => {
      toastsStore.update(list => list.filter(t => t.id !== id));
    }, duration);
  }
}
