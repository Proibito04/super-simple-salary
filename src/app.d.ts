// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface Platform {}
  }
}

import 'unplugin-icons/types/svelte';

declare module 'virtual:pwa-register/svelte' {
  import type { Writable } from 'svelte/store';
  export function useRegisterSW(options?: {
    immediate?: boolean;
    onRegisterError?: (error: any) => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisteredSW?: (swScriptUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
  }): {
    needRefresh: Writable<boolean>;
    offlineReady: Writable<boolean>;
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  };
}

export {};
