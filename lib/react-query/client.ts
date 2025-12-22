/**
 * React Query Client Configuration
 * Centralized QueryClient setup with optimized defaults for dispatch app
 */

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Always refetch on mount for fresh data (critical for dispatch app)
      staleTime: 0,
      // Keep in memory for 5 minutes for quick navigation
      gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
      // Retry failed requests
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus (optional, can be disabled if needed)
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect automatically (we'll handle it manually)
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

