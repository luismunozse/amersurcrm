import { vi, beforeEach } from 'vitest';

/**
 * Mock mínimo de la API de Chrome. Casi todo el código de la extensión hace
 * `typeof chrome !== 'undefined'` antes de usarla, pero varios módulos
 * (logger, api) leen storage al construirse, así que conviene tenerla siempre.
 *
 * `__resetChromeStorage()` deja el storage limpio entre tests.
 */
type Store = Record<string, unknown>;
const store: Store = {};

function area() {
  return {
    get: (keys: string | string[], cb?: (items: Store) => void) => {
      const out: Store = {};
      for (const k of ([] as string[]).concat(keys)) if (k in store) out[k] = store[k];
      cb?.(out);
      return Promise.resolve(out);
    },
    set: (items: Store, cb?: () => void) => {
      Object.assign(store, items);
      cb?.();
      return Promise.resolve();
    },
    remove: (keys: string | string[], cb?: () => void) => {
      for (const k of ([] as string[]).concat(keys)) delete store[k];
      cb?.();
      return Promise.resolve();
    },
  };
}

(globalThis as any).chrome = {
  runtime: {
    getURL: (path: string) => `chrome-extension://amersurchat-test/${path}`,
    getManifest: () => ({ version: '1.3.0' }),
  },
  storage: { local: area(), session: area() },
};

(globalThis as any).__chromeStore = store;
(globalThis as any).__resetChromeStorage = (inicial: Store = {}) => {
  for (const k of Object.keys(store)) delete store[k];
  Object.assign(store, inicial);
};

beforeEach(() => {
  vi.restoreAllMocks();
});
