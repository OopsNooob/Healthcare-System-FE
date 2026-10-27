export interface StorageProvider {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

let currentStorage: StorageProvider | null = null;
let warned = false;

export function setStorageProvider(provider: StorageProvider) {
  currentStorage = provider;
}

let memoryStore: Map<string, string> | null = null;
function getMemoryStorage(): StorageProvider {
  if (!memoryStore) {
    memoryStore = new Map<string, string>();
  }
  const store = memoryStore;
  return {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

export function getStorage(): StorageProvider {
  if (currentStorage) {
    return currentStorage;
  }

  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }

  // Return a lazy proxy that waits for the next microtask in case setStorageProvider
  // is executed in the same module evaluation tick (e.g., at app startup).
  return {
    getItem: async (key: string) => {
      if (!currentStorage) {
        await Promise.resolve();
      }
      if (currentStorage) {
        return currentStorage.getItem(key);
      }
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      if (!warned) {
        warned = true;
        console.warn("Storage provider not set. Falling back to memory storage.");
      }
      return getMemoryStorage().getItem(key);
    },
    setItem: async (key: string, value: string) => {
      if (!currentStorage) {
        await Promise.resolve();
      }
      if (currentStorage) {
        return currentStorage.setItem(key, value);
      }
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.setItem(key, value);
      }
      return getMemoryStorage().setItem(key, value);
    },
    removeItem: async (key: string) => {
      if (!currentStorage) {
        await Promise.resolve();
      }
      if (currentStorage) {
        return currentStorage.removeItem(key);
      }
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.removeItem(key);
      }
      return getMemoryStorage().removeItem(key);
    },
  };
}
