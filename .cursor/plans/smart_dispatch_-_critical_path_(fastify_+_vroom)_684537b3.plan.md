---
name: Smart Dispatch - Critical Path (Fastify + VROOM)
overview: Minimal critical steps to implement smart dispatch with Fastify backend, PostgreSQL, and VROOM routing. Direct API calls, no local database.
todos:
  - id: fastify_setup
    content: Set up Fastify server with PostgreSQL connection pool and basic configuration
    status: completed
  - id: database_schema
    content: "Create minimal PostgreSQL schema: orders (with package dimensions), drivers, vehicles tables"
    status: completed
  - id: vroom_service
    content: Implement VROOM service to convert orders/vehicles to VROOM format and call VROOM API
    status: completed
  - id: optimize_endpoint
    content: Create POST /api/routes/optimize endpoint that calls VROOM and updates order ranks
    status: completed
  - id: orders_api
    content: Implement basic orders CRUD endpoints (POST for CSV bulk create, GET with filters)
    status: completed
  - id: api_client
    content: Create API client service in React Native to call Fastify backend endpoints
    status: completed
  - id: store_integration
    content: Update Zustand store to fetch from API and add optimizeRoute() action calling backend
    status: completed
  - id: csv_parser
    content: Enhance CSV parser to extract package dimensions (length, width, height, weight) and calculate volume
    status: completed
  - id: optimize_ui
    content: Add Optimize Route button in zone-detail screen that calls optimizeRoute() and displays results
    status: completed
---

# Smart Dispatch - Critical Path (Fastify + VROOM)

## Architecture

```
React Native App ←→ Fastify API ←→ PostgreSQL ←→ VROOM
```

**No local database** - Direct API calls, keep existing MMKV/AsyncStorage for simple preferences only.

## Critical Steps (Must-Have Only)

### Step 1: Backend Foundation (Fastify + PostgreSQL)

**Files to create:**

- `backend/package.json` - Fastify, pg, VROOM client
- `backend/server.js` - Fastify app entry point
- `backend/db/connection.js` - PostgreSQL connection pool
- `backend/db/migrations/001_initial.sql` - Core tables

**Minimal Schema:**

```sql
-- Orders with package dimensions
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(255) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    driver_id UUID,
    route_rank INTEGER,

    -- Package capacity (critical for VROOM)
    package_length DECIMAL(8, 2),
    package_width DECIMAL(8, 2),
    package_height DECIMAL(8, 2),
    package_weight DECIMAL(8, 2),
    package_volume DECIMAL(10, 2),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Drivers
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL
);

-- Vehicles (capacity constraints)
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES drivers(id),
    max_weight DECIMAL(8, 2),
    max_volume DECIMAL(10, 2),
    max_length DECIMAL(8, 2),
    max_width DECIMAL(8, 2),
    max_height DECIMAL(8, 2)
);
```

**Dependencies:**

```json
{
  "fastify": "^4.24.3",
  "@fastify/postgres": "^5.1.0",
  "pg": "^8.11.3",
  "uuid": "^9.0.1"
}
```

### Step 2: VROOM Integration Service

**File:** `backend/services/vroom.js`

**Critical functions:**

1. `convertOrdersToVROOM(orders)` - Transform orders to VROOM job format
2. `convertVehicleToVROOM(vehicle)` - Transform vehicle to VROOM vehicle format
3. `callVROOM(jobs, vehicles)` - HTTP POST to VROOM API
4. `parseVROOMResponse(response)` - Extract optimized route sequence

**VROOM API call:**

```javascript
// POST to VROOM (Docker container or service)
const response = await fetch('http://vroom:3000', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jobs: [...],      // Orders with coordinates, capacity
    vehicles: [...],  // Vehicles with capacity constraints
    options: { g: true }  // Geometry (distance matrix)
  })
});
```

### Step 3: Route Optimization Endpoint

**File:** `backend/routes/optimize.js`

**Endpoint:** `POST /api/routes/optimize`

**Logic:**

1. Fetch orders by driver_id from PostgreSQL
2. Fetch vehicle for driver
3. Convert to VROOM format
4. Call VROOM service
5. Parse response → update order ranks in DB
6. Return optimized route

**Response:**

```json
{
  "totalDistance": 45.2,
  "totalDuration": 3600,
  "orders": [
    { "orderId": "uuid", "rank": 1, "distanceFromPrev": 0 },
    { "orderId": "uuid", "rank": 2, "distanceFromPrev": 2.5 }
  ]
}
```

### Step 4: Orders API Endpoint

**File:** `backend/routes/orders.js`

**Critical endpoints:**

- `POST /api/orders` - Bulk create from CSV
- `GET /api/orders?driver_id=uuid` - Get orders for driver
- `PUT /api/orders/:id` - Update order (for sync)

### Step 5: API Client Service

**File:** `lib/services/api.ts` (new)

**Critical functions:**

1. `fetchOrders(driverId?)` - GET /api/orders
2. `createOrders(orders)` - POST /api/orders (bulk from CSV)
3. `optimizeRoute(driverId, orderIds)` - POST /api/routes/optimize
4. `updateOrder(orderId, data)` - PUT /api/orders/:id

**Implementation:**

- Use `fetch` or `axios`
- Handle errors and loading states
- Base URL from environment config

### Step 6: Store Integration

**File:** `store/dispatch-store.ts` (modify)

**Changes:**

- Replace local CSV parsing with API call: `createOrders()` → POST /api/orders
- Replace local orders state with API fetch: `fetchOrders()` on mount
- Add `optimizeRoute(driverId)` action → calls `/api/routes/optimize`
- Keep `zones` computed locally from fetched orders (or fetch from API if backend computes)

**Remove:**

- CSV text storage (send directly to API)
- Local order persistence (fetch from API instead)

**Keep:**

- `isLoading` state for API calls
- Existing zone clustering logic (or move to backend)

### Step 7: CSV Parser Enhancement

**File:** `lib/csv/parser.ts` (modify)

**Add parsing for:**

- Package dimensions: `length`, `width`, `height`, `weight`
- Calculate `volume = length × width × height`

### Step 9: Types Update

**File:** `lib/types/index.ts` (modify)

**Add to Order:**

```typescript
packageLength?: number;
packageWidth?: number;
packageHeight?: number;
packageWeight?: number;
packageVolume?: number;
serverId?: string;  // UUID from backend
```

**Add new:**

```typescript
export interface Vehicle {
  id: string;
  driverId: string;
  maxWeight: number;
  maxVolume: number;
  maxLength: number;
  maxWidth: number;
  maxHeight: number;
}
```

### Step 9: UI - Optimize Button

**File:** `app/zone-detail.tsx` (modify)

**Add:**

- "Optimize Route" button
- Call `optimizeRoute()` from store
- Show loading state
- Display optimized route with distances

## Implementation Order (Critical Path)

1. **Backend API** (Day 1-2)

   - Fastify server + PostgreSQL connection
   - Orders CRUD endpoints
   - Basic VROOM service

2. **VROOM Integration** (Day 2-3)

   - VROOM service implementation
   - Route optimization endpoint
   - Test with sample data

3. **React Native API Integration** (Day 3-4)

   - API client service
   - Store updates to fetch from API
   - Replace local CSV with API calls

4. **CSV + UI** (Day 4-5)

   - CSV parser enhancement (send to API)
   - Optimize button in UI

## Minimal File Structure

```
backend/
├── server.js
├── package.json
├── db/
│   ├── connection.js
│   └── migrations/001_initial.sql
├── routes/
│   ├── orders.js
│   └── optimize.js
└── services/
    └── vroom.js

frontend/
├── lib/
│   ├── services/api.ts (new)        # API client
│   ├── csv/parser.ts (modify)       # Parse CSV, send to API
│   └── types/index.ts (modify)      # Add package/vehicle types
├── store/dispatch-store.ts (modify) # Fetch from API, add optimizeRoute()
└── app/zone-detail.tsx (modify)     # Add optimize button
```

## VROOM Deployment Options

1. **Docker Container** (Recommended)
   ```bash
   docker run -p 3000:3000 vroom/vroom
   ```

2. **External Service** (if hosted)

   - Use VROOM-as-a-Service API

## Critical Dependencies

**Backend:**

- fastify
- @fastify/postgres
- pg
- uuid

**Frontend:**

- (keep existing: zustand, supercluster, etc.)
- No new dependencies needed (use native fetch)

## What's NOT Critical (Can Add Later)

- Local database/caching
- Offline support
- Sync conflict resolution
- Vehicle management UI
- Package size input UI (can use CSV for now)
- Route visualization
- Time windows
- Advanced VROOM options

## Success Criteria

1. ✅ CSV upload sends orders to Fastify API → PostgreSQL
2. ✅ App fetches orders from API on load
3. ✅ "Optimize Route" button calls `/api/routes/optimize`
4. ✅ VROOM returns optimized sequence
5. ✅ Order ranks update in PostgreSQL
6. ✅ App shows optimized route with distances