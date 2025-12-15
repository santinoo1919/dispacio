/**
 * Storage Adapter
 *
 * Provides a unified storage interface that:
 * - Uses MMKV when available (dev client/production builds) for best performance
 * - Falls back to AsyncStorage (Expo Go) for compatibility
 *
 * This is essential for apps that will store large amounts of data
 * (past trips, driver insights, analytics, etc.)
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// Try to import MMKV, but it may not be available in Expo Go
let mmkvStorage: any = null;
let isMMKVAvailable = false;

try {
  const { createMMKV } = require("react-native-mmkv");
  mmkvStorage = createMMKV({
    id: "dispatch-storage",
  });
  isMMKVAvailable = true;
  console.log("[Storage] MMKV initialized successfully");
} catch {
  // MMKV not available (e.g., in Expo Go)
  // Will fall back to AsyncStorage
  console.log("[Storage] MMKV not available, using AsyncStorage fallback");
}

/**
 * Storage adapter interface - all methods are async for consistency
 * This ensures type safety and compatibility with Zustand's persist middleware
 */
interface StorageAdapter {
  setItem: (name: string, value: string) => Promise<void>;
  getItem: (name: string) => Promise<string | null>;
  removeItem: (name: string) => Promise<void>;
}

/**
 * Storage adapter that implements Zustand's storage interface
 * Automatically uses MMKV if available, otherwise AsyncStorage
 *
 * CRITICAL: All methods return Promises for consistency, even though MMKV is synchronous.
 * This is the standard pattern used by React Native, Expo, and Zustand teams because:
 * 1. Type safety - TypeScript can properly type a consistent async interface
 * 2. Zustand compatibility - createJSONStorage expects uniform async methods
 * 3. Error handling - Consistent Promise-based error propagation
 * 4. Future-proofing - Easy to swap implementations without breaking code
 */
export const getStorage = (): StorageAdapter => {
  if (isMMKVAvailable && mmkvStorage) {
    // MMKV: wrap sync operations in async functions for consistency
    return {
      setItem: async (name: string, value: string) => {
        mmkvStorage.set(name, value);
      },
      getItem: async (name: string) => {
        return mmkvStorage.getString(name) ?? null;
      },
      removeItem: async (name: string) => {
        mmkvStorage.delete(name);
      },
    };
  }

  // AsyncStorage: already async, use directly
  return {
    setItem: (name: string, value: string) => AsyncStorage.setItem(name, value),
    getItem: (name: string) => AsyncStorage.getItem(name),
    removeItem: (name: string) => AsyncStorage.removeItem(name),
  };
};

/**
 * Check if MMKV is being used (useful for debugging)
 */
export const isUsingMMKV = (): boolean => {
  return isMMKVAvailable;
};
