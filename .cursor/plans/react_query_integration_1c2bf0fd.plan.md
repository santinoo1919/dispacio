---
name: React Query Integration
overview: Integrate React Query to manage all server state (orders, zones, driver assignments) while keeping Zustand only for client-only UI state (CSV text, clipboard). React Query becomes the single source of truth for backend data with smart caching, optimistic updates for fast operations, and fresh data on mount.
todos: []
---

# React Query Integration Plan

## Architecture Overview

### Data Flow

```
Backend (PostgreSQL) 
  ↓
React Query (Server State - Source of Truth)
  ↓
Components (Read from React Query)
  ↓
Zustand (Client State Only - CSV text, UI preferences)
```

### Boundaries

**React Query (Server State):**

- Orders (fetched, created, updated, deleted)
- Zones (fetched, created, driver assignments)
- Route optimizations
- All data that comes from/needs to sync with backend

**Zustand (Client State):**

- `csvText` - Temporary CSV input before upload
- Clipboard state
- UI preferences (if any)
- Any state that doesn't need backend sync

## Implementation Strategy

### 1. React Query Setup

**File: `lib/react-query/client.ts`**

- Create QueryClient with optimized defaults
- Configure staleTime: 0 (always refetch on mount for fresh data)
- Configure cacheTime: 5 minutes (keep in memory for quick navigation)
- Add error handling defaults
- Add retry logic (3 retries with exponential backoff)

**File: `app/_layout.tsx` or root component**

- Wrap app with QueryClientProvider
- Use React Query DevTools in development

### 2. Query Hooks (Read Operations)

**File: `hooks/use-orders.ts`**

```typescript
- useOrders(driverId?: string) - Fetch all orders or filtered by driver
- useOrder(orderId: string) - Fetch single order
- Query keys: ['orders'], ['orders', driverId], ['orders', orderId]
- Transform backend format to frontend format (driver_id → driverId)
```

**File: `hooks/use-zones.ts`**

```typescript
- useZones() - Fetch all zones with orders
- Query key: ['zones']
- Transform backend zones to frontend format
- Auto-create zones if orders exist but no zones (move logic from store)
```

**File: `hooks/use-route-optimization.ts`**

```typescript
- useRouteOptimization(driverId, orderIds) - Fetch optimized route
- Query key: ['route-optimization', driverId, orderIds]
- Only fetch when explicitly requested (enabled: false by default)
```

### 3. Mutation Hooks (Write Operations)

**File: `hooks/use-order-mutations.ts`**

```typescript
- useCreateOrders() - Bulk create from CSV
  - NO optimistic update (long operation, could fail)
  - On success: invalidate ['orders'], ['zones']
  - Show loading toast during mutation

- useUpdateOrder() - Update single order
  - NO optimistic update (rarely used directly)
  - On success: invalidate ['orders'], ['orders', orderId]

- useBulkAssignDriver() - Assign driver to multiple orders
  - NO optimistic update (used internally by zone assignment)
  - On success: invalidate ['orders'], ['zones']

- useDeleteOrder() - Delete order
  - Optimistic update: Remove from cache immediately
  - On error: Rollback
  - On success: invalidate ['orders'], ['zones']
```

**File: `hooks/use-zone-mutations.ts`**

```typescript
- useCreateZones() - Create zones from clustering
  - NO optimistic update (complex operation)
  - On success: invalidate ['zones'], ['orders']

- useAssignDriverToZone() - Assign driver to zone
  - OPTIMISTIC UPDATE: Update zone and orders in cache immediately
  - On error: Rollback using onError
  - On success: Refetch to ensure consistency
  - This is fast, low-risk, users expect immediate feedback
```

**File: `hooks/use-route-mutations.ts`**

```typescript
- useOptimizeRoute() - Optimize route for driver
  - NO optimistic update (external API, could take time)
  - On success: invalidate ['orders'] to get updated ranks
  - Show loading state during optimization
```

### 4. Persistence Strategy

**Decision: No persistence of server data**

- Orders and zones change frequently (new orders, assignments, optimizations)
- Stale data could cause wrong driver assignments
- Always fetch fresh on mount (staleTime: 0)
- Cache in memory for quick navigation (cacheTime: 5min)
- If offline support needed later, add persistence adapter

**Keep Zustand persistence for:**

- `csvText` - User's work-in-progress CSV input
- This is client-only state, safe to persist

### 5. Migration Steps

**Phase 1: Setup React Query**

1. Install `@tanstack/react-query`
2. Create QueryClient configuration
3. Add QueryClientProvider to app root
4. Create query/mutation hook structure

**Phase 2: Migrate Queries**

1. Replace `fetchOrdersFromAPI()` with `useOrders()`
2. Replace `fetchZones()` calls with `useZones()`
3. Update components to use hooks instead of store

**Phase 3: Migrate Mutations**

1. Replace `parseAndUploadCSV()` with `useCreateOrders()`
2. Replace `assignDriverToZone()` with `useAssignDriverToZone()`
3. Replace `optimizeRoute()` with `useOptimizeRoute()`
4. Add optimistic updates for driver assignment

**Phase 4: Cleanup Zustand**

1. Remove server state from Zustand store
2. Keep only `csvText` and related UI state
3. Remove `fetchOrdersFromAPI`, `assignDriverToZone`, `optimizeRoute` from store
4. Update store interface

**Phase 5: Add Transformers (Future)**

- Add Zod schemas for runtime validation
- Transform backend → frontend in query hooks
- This prevents type mismatches

### 6. Component Updates

**File: `app/(tabs)/index.tsx`**

```typescript
// Before: const { orders, zones, fetchOrdersFromAPI } = useDispatchStore();
// After:
const { data: zones } = useZones();
const orders = zones?.flatMap(z => z.orders) || [];
// Remove useEffect, React Query handles fetching
```

**File: `app/zone-detail.tsx`**

```typescript
// Use useZones() to get zone data
// Use useAssignDriverToZone() mutation
// Use useOptimizeRoute() mutation
```

**File: `app/paste-csv.tsx`**

```typescript
// Keep csvText in Zustand (client state)
// Use useCreateOrders() mutation for upload
```

**File: `components/dispatch/zone-card.tsx`**

```typescript
// Use useOptimizeRoute() mutation
// Remove store dependency for server state
```

### 7. Error Handling

- Use React Query's built-in error states
- Show toast notifications on mutation errors
- Handle network errors gracefully
- Retry failed queries automatically

### 8. Loading States

- React Query provides `isLoading`, `isFetching`, `isPending` states
- Use `isPending` for mutations (optimistic updates show immediately)
- Use `isLoading` for initial queries
- Use `isFetching` for background refetches

## Key Benefits

1. **Backend as Source of Truth**: All server data comes from React Query cache
2. **Automatic Sync**: Cache invalidation ensures UI stays in sync
3. **Optimistic UX**: Driver assignments feel instant
4. **Fresh Data**: Always refetch on mount (critical for dispatch app)
5. **Clean Separation**: Zustand for UI, React Query for server
6. **Type Safety**: Transformers (future) prevent ID mismatches

## Files to Create/Modify

**New Files:**

- `lib/react-query/client.ts` - QueryClient setup
- `hooks/use-orders.ts` - Order queries
- `hooks/use-zones.ts` - Zone queries  
- `hooks/use-order-mutations.ts` - Order mutations
- `hooks/use-zone-mutations.ts` - Zone mutations
- `hooks/use-route-mutations.ts` - Route optimization mutations

**Modify Files:**

- `store/dispatch-store.ts` - Remove server state, keep only csvText
- `app/(tabs)/index.tsx` - Use React Query hooks
- `app/zone-detail.tsx` - Use React Query hooks
- `app/paste-csv.tsx` - Use mutation hook
- `components/dispatch/zone-card.tsx` - Use mutation hook
- `app/_layout.tsx` - Add QueryClientProvider

## Migration Notes

- Keep Zustand store during migration for backward compatibility
- Gradually replace store usage with hooks
- Test each phase before moving to next
- Remove store methods only after all components migrated