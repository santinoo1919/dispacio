---
name: Replace VROOM with node_or_tools VRP Solver
overview: Replace VROOM Docker service with node_or_tools (runs in Node.js) using Haversine formula for distance calculations. This eliminates Docker dependency while maintaining route optimization functionality.
todos:
  - id: step1_install
    content: Install node_or_tools package in backend/package.json
    status: completed
  - id: step2_distance
    content: Create distance.js with Haversine distance matrix calculator
    status: completed
  - id: step3_converters
    content: Create OR-Tools format conversion functions (orders and vehicles)
    status: completed
  - id: step4_solver
    content: Implement OR-Tools VRP solver function with distance matrix
    status: completed
  - id: step5_parser
    content: Create parser to convert OR-Tools solution to existing response format
    status: completed
  - id: step6_endpoint
    content: Update optimize.js endpoint to use new solver instead of VROOM
    status: completed
  - id: step7_exports
    content: Update service exports and ensure backward compatibility
    status: completed
  - id: step8_env
    content: Remove VROOM_URL references and update documentation
    status: completed
  - id: step9_testing
    content: Test optimization with various scenarios via Swagger UI
    status: completed
  - id: step10_cleanup
    content: Clean up unused code and update comments/documentation
    status: completed
---

# Replace VROOM with node_or_tools VRP Solver

## Overview

Replace the external VROOM service (requires Docker) with `node_or_tools` - a pure Node.js VRP solver that runs directly in the backend. Uses Haversine formula for distance calculations.

## Current Architecture

```
Fastify Backend → callVROOM() → External VROOM Service (Docker) → Response
```

## New Architecture

```
Fastify Backend → node_or_tools VRP Solver (in-process) → Response
```

## Implementation Steps

### Step 1: Install node_or_tools Package

**File:** `backend/package.json`

- Add `node_or_tools` to dependencies
- Run `npm install`
- Verify installation works

**Validation:** Check package installs without errors

---

### Step 2: Create Haversine Distance Calculator

**File:** `backend/services/distance.js` (new file)

- Create distance calculation utility using Haversine formula
- Function: `calculateDistance(lat1, lng1, lat2, lng2)` → returns km
- Function: `buildDistanceMatrix(locations)` → returns 2D array
- Locations format: `[{lat, lng}, ...]`

**Validation:** Test with known coordinates, verify distance calculations

---

### Step 3: Create OR-Tools Format Converters

**File:** `backend/services/vroom.js` (modify)

- Rename file to `backend/services/route-optimizer.js` (or keep name, update functions)
- Create `convertOrdersToORTools(orders)` function
  - Convert orders to OR-Tools locations format
  - Extract coordinates: `[{lat, lng}, ...]`
  - Map order indices for later reference
- Create `convertVehicleToORTools(vehicle, orders)` function
  - Extract vehicle capacity constraints
  - Set depot/start location
  - Format for OR-Tools VRP solver

**Validation:** Test conversion functions with sample data, verify format matches OR-Tools requirements

---

### Step 4: Implement OR-Tools VRP Solver

**File:** `backend/services/route-optimizer.js` (or update vroom.js)

- Import `node_or_tools`
- Create `solveVRPWithORTools(orders, vehicle, distanceMatrix)` function
- Initialize OR-Tools VRP solver
- Configure solver options (time limits, search strategies)
- Build distance matrix using Haversine calculator
- Call solver with jobs, vehicles, and distance matrix
- Handle solver errors

**Validation:** Test solver with small dataset (3-5 orders), verify it returns a solution

---

### Step 5: Create Response Parser

**File:** `backend/services/route-optimizer.js`

- Create `parseORToolsResponse(ortoolsSolution, orders)` function
- Extract route sequence from OR-Tools solution
- Map back to original order IDs
- Calculate distances between consecutive orders using Haversine
- Format response to match existing `parseVROOMResponse` output:
  ```javascript
  {
    totalDistance: number, // km
    totalDuration: number, // seconds (estimated)
    orders: [{
      orderId: string,
      orderNumber: string,
      rank: number,
      distanceFromPrev: number // km
    }]
  }
  ```


**Validation:** Verify parsed response matches expected format, check distance calculations

---

### Step 6: Update Route Optimization Endpoint

**File:** `backend/routes/optimize.js`

- Replace `callVROOM` import with new solver function
- Replace `parseVROOMResponse` with new parser
- Update function calls:
  - Remove VROOM_URL check (no longer needed)
  - Call new solver instead of `callVROOM`
  - Use new parser instead of `parseVROOMResponse`
- Update error messages to reference OR-Tools instead of VROOM

**Validation:** Test endpoint via Swagger UI, verify optimization works end-to-end

---

### Step 7: Update Service Exports

**File:** `backend/services/vroom.js` (or new file name)

- Update exports to match new function names
- Ensure backward compatibility with existing imports
- Update file comments/documentation

**Validation:** Verify all imports still work, check for broken references

---

### Step 8: Update Environment Configuration

**File:** `backend/.env` (if exists) or `backend/README.md`

- Remove `VROOM_URL` environment variable references
- Update documentation to reflect node_or_tools usage
- Remove Docker setup instructions for VROOM

**Validation:** Check no code references VROOM_URL, documentation is accurate

---

### Step 9: Testing & Validation

**Files:** Test via Swagger UI

- Test with 3-5 orders (small dataset)
- Test with 10+ orders (larger dataset)
- Test with orders missing coordinates (error handling)
- Test with no vehicle constraints
- Test with vehicle capacity constraints
- Verify order ranks update in database
- Verify response format matches API schema

**Validation:** All test cases pass, routes are optimized correctly

---

### Step 10: Cleanup (Optional)

**Files:** Various

- Remove unused VROOM conversion functions (if not needed)
- Update code comments
- Remove VROOM references from documentation
- Consider renaming `vroom.js` to `route-optimizer.js` for clarity

**Validation:** Code is clean, no dead code, documentation updated

## Key Files to Modify

1. `backend/package.json` - Add node_or_tools dependency
2. `backend/services/distance.js` - New file for Haversine calculations
3. `backend/services/vroom.js` - Replace VROOM calls with OR-Tools solver
4. `backend/routes/optimize.js` - Update to use new solver
5. `backend/README.md` - Update documentation

## Technical Details

### Distance Matrix Format

OR-Tools requires a 2D array where `matrix[i][j]` = distance from location i to location j in meters.

### OR-Tools VRP Input Format

```javascript
{
  locations: [{lat, lng}, ...],  // All locations (depot + orders)
  distanceMatrix: [[...], ...],  // NxN matrix
  demands: [0, weight1, weight2, ...],  // Depot = 0
  vehicleCapacities: [maxWeight],
  numVehicles: 1
}
```

### Expected Output Format

Matches existing VROOM response format for compatibility:

```javascript
{
  totalDistance: number,  // km
  totalDuration: number,  // seconds
  orders: [{
    orderId: string,
    orderNumber: string,
    rank: number,
    distanceFromPrev: number  // km
  }]
}
```

## Dependencies

- `node_or_tools` - VRP solver (MIT License, free)
- Haversine formula - Already implemented in `lib/utils/distance.ts` (can reuse logic)

## Notes

- Keep existing API response format for backward compatibility
- Distance calculations use Haversine (straight-line), not road distances
- For production, consider adding road distance API later (optional)
- Solver runs synchronously in Node.js process (no external service)