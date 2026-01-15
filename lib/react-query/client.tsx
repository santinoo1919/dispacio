/**
 * React Query Client Configuration
 * Centralized QueryClient setup with optimized defaults for dispatch app
 * 
 * Persistence Strategy:
 * - Orders/zones/drivers cached to MMKV for offline access
 * - 24h staleTime (orders created once/day)
 * - Refetch on focus to catch other users' changes
 * - Mutations invalidate queries to ensure consistency
 * 
 * Uses sync persister with MMKV (best practice for MMKV since it's synchronous)
 */

import React, { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

// Try to import sync persister (best practice for MMKV)
let createSyncStoragePersister: any = null;
try {
  createSyncStoragePersister = require("@tanstack/query-sync-storage-persister").createSyncStoragePersister;
} catch {
  console.log("[React Query] Sync persister not installed - persistence disabled. Install: npm install @tanstack/query-sync-storage-persister");
}

// Get MMKV storage directly (sync operations)
let mmkvStorage: any = null;
let isMMKVAvailable = false;

try {
  const { createMMKV } = require("react-native-mmkv");
  mmkvStorage = createMMKV({
    id: "react-query-cache", // Separate MMKV instance for React Query
  });
  isMMKVAvailable = true;
  console.log("[React Query] MMKV persistence initialized");
} catch {
  // MMKV not available (e.g., in Expo Go)
  console.log("[React Query] MMKV not available, persistence disabled");
}

/**
 * Create sync storage adapter for MMKV
 * MMKV is synchronous, so we use sync persister (faster, no Promise overhead)
 */
const syncStorage = mmkvStorage
  ? {
      setItem: (key: string, value: string) => {
        mmkvStorage.set(key, value);
      },
      getItem: (key: string) => {
        const value = mmkvStorage.getString(key);
        return value === undefined ? null : value;
      },
      removeItem: (key: string) => {
        mmkvStorage.delete(key);
      },
    }
  : null;

/**
 * Create sync persister using MMKV (best practice for MMKV)
 * Falls back to null if MMKV unavailable or sync persister not installed
 */
export const persister = syncStorage && createSyncStoragePersister
  ? createSyncStoragePersister({
      storage: syncStorage,
      key: "REACT_QUERY_OFFLINE_CACHE",
      serialize: JSON.stringify,
      deserialize: JSON.parse,
    })
  : null;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 24 hours staleTime - orders created once/day, zones stable after optimization
      staleTime: 24 * 60 * 60 * 1000, // 24 hours
      // Keep in memory/MMKV for 7 days for quick navigation
      gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
      // Retry failed requests
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on focus to catch other users' changes (driver assignments, optimizations)
      refetchOnWindowFocus: true,
      // Don't refetch on reconnect (focus covers it, and staleTime handles freshness)
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      // Show errors in UI, don't fail silently
      onError: (error) => {
        console.error("Mutation error:", error);
      },
    },
  },
});

/**
 * PersistQueryClientProvider wrapper component
 * Only enables persistence if MMKV is available (production builds)
 * Falls back to regular QueryClientProvider in Expo Go
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  // If persister is null (MMKV unavailable), use regular provider without persistence
  if (!persister) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days max age in persistence
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

