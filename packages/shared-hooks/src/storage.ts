export interface StorageProvider {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

let currentStorage: StorageProvider | null = null;

export function setStorageProvider(provider: StorageProvider) {
  currentStorage = provider;
}

export function getStorage(): StorageProvider {
  if (!currentStorage) {
    console.warn("Storage provider not set. Falling back to memory storage.");
    return createMemoryStorage();
  }
  return currentStorage;
}

function createMemoryStorage(): StorageProvider {
  const store = new Map<string, string>();
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
