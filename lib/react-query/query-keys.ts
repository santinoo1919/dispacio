/**
 * Typed Query Key Factory
 * Centralized, type-safe query keys for React Query
 * 
 * Benefits:
 * - Prevents serialization bugs (e.g., serializing entire objects)
 * - Provides autocomplete for query keys
 * - Single source of truth for query key structure
 * - Makes cache updates more reliable
 */

export const queryKeys = {
  orders: {
    all: ['orders'] as const,
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    list: (filters?: { driverId?: string }) =>
      [...queryKeys.orders.lists(), filters] as const,
    details: () => [...queryKeys.orders.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.orders.details(), id] as const,
  },
  zones: {
    all: ['zones'] as const,
    lists: () => [...queryKeys.zones.all, 'list'] as const,
    list: (filters?: { driverIds?: string[] }) =>
      [...queryKeys.zones.lists(), filters] as const,
  },
  drivers: {
    all: ['drivers'] as const,
    lists: () => [...queryKeys.drivers.all, 'list'] as const,
    list: (filters?: { isActive?: boolean }) =>
      [...queryKeys.drivers.lists(), filters] as const,
    details: () => [...queryKeys.drivers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.drivers.details(), id] as const,
  },
} as const;

