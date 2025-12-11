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
} catch (error) {
  // MMKV not available (e.g., in Expo Go)
  // Will fall back to AsyncStorage
  console.log("[Storage] MMKV not available, using AsyncStorage fallback");
}

/**
 * Storage adapter that implements Zustand's storage interface
 * Automatically uses MMKV if available, otherwise AsyncStorage
 *
 * Note: Zustand's createJSONStorage can handle both sync (MMKV) and async (AsyncStorage) storage
 */
export const getStorage = () => {
  if (isMMKVAvailable && mmkvStorage) {
    // MMKV adapter (synchronous, but Zustand handles it)
    return {
      setItem: (name: string, value: string) => {
        mmkvStorage.set(name, value);
      },
      getItem: (name: string) => {
        return mmkvStorage.getString(name) ?? null;
      },
      removeItem: (name: string) => {
        mmkvStorage.delete(name);
      },
    };
  } else {
    // AsyncStorage adapter (async)
    return {
      setItem: async (name: string, value: string) => {
        await AsyncStorage.setItem(name, value);
      },
      getItem: async (name: string) => {
        return await AsyncStorage.getItem(name);
      },
      removeItem: async (name: string) => {
        await AsyncStorage.removeItem(name);
      },
    };
  }
};

/**
 * Check if MMKV is being used (useful for debugging)
 */
export const isUsingMMKV = (): boolean => {
  return isMMKVAvailable;
};
