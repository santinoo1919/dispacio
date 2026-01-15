/**
 * Route Optimization Service
 * Uses OR-Tools (node_or_tools) for VRP solving
 * Replaces VROOM service (no Docker needed)
 */

import { buildDistanceMatrix } from "./distance.js";

/**
 * Convert orders to OR-Tools format
 * @param {Array} orders - Array of order objects from database
 * @param {Object} depotLocation - Depot location {lat, lng}
 * @returns {Object} OR-Tools problem data with locations, demands, and order mapping
 */
export function convertOrdersToORTools(orders, depotLocation) {
  // Validate all orders have coordinates
  for (const order of orders) {
    if (!order.latitude || !order.longitude) {
      throw new Error(`Order ${order.order_number} missing coordinates`);
    }
  }

  // Build locations array: [depot, ...orders]
  // OR-Tools expects [lat, lng] format
  const locations = [
    { lat: depotLocation.lat, lng: depotLocation.lng }, // Depot at index 0
    ...orders.map((order) => ({
      lat: order.latitude,
      lng: order.longitude,
    })),
  ];

  // Build demands array: 2D array where demands[at] = [demand, demand, ...]
  // The 'to' index is unused but required - use same value for all 'to' indices
  // Format: demands[at][to] where to is unused
  // Each row must have length = locations.length
  // OR-Tools expects integers, not floats
  const demands = [
    new Array(locations.length).fill(0), // Depot has no demand (repeat for all 'to' indices)
    ...orders.map((order) => {
      // Use weight if available, otherwise use volume, otherwise default to 1
      // Convert to integer (OR-Tools requirement)
      const demand = Math.round(
        order.package_weight || order.package_volume || 1
      );
      // Return array with same value for all 'to' indices (unused but required)
      return new Array(locations.length).fill(demand);
    }),
  ];

  // Create mapping: order index in original array -> location index in OR-Tools array
  // Location index 0 = depot, location index 1+ = orders
  const orderIndexMap = new Map();
  orders.forEach((order, index) => {
    orderIndexMap.set(index, index + 1); // +1 because depot is at index 0
  });

  return {
    locations, // Array of {lat, lng} objects
    demands, // Array of numbers (depot = 0)
    orderIndexMap, // Map: original order index -> OR-Tools location index
  };
}

/**
 * Convert vehicle to OR-Tools format and get depot location
 * @param {Object} vehicle - Vehicle object from database
 * @param {Object} driver - Driver object
 * @param {Array} orders - Orders for this driver (to calculate depot location)
 * @returns {Object} Depot location and vehicle capacity
 */
export function convertVehicleToORTools(vehicle, driver, orders) {
  // Determine depot location (start/end point)
  let depotLocation;
  if (orders.length > 0 && orders[0].latitude && orders[0].longitude) {
    // Use first order location as depot
    depotLocation = {
      lat: orders[0].latitude,
      lng: orders[0].longitude,
    };
  } else {
    // Default to a central location (e.g., warehouse)
    depotLocation = {
      lat: 25.2048, // Dubai center
      lng: 55.2708,
    };
  }

  // Get vehicle capacity (use weight if available, otherwise volume, otherwise default)
  const vehicleCapacity = vehicle?.max_weight || vehicle?.max_volume || 1000;

  return {
    depotLocation,
    vehicleCapacity,
  };
}

/**
 * Solve VRP using OR-Tools
 * @param {Array} orders - Array of order objects from database
 * @param {Object} vehicle - Vehicle object with capacity
 * @param {Object} depotLocation - Depot location {lat, lng}
 * @returns {Promise<Object>} OR-Tools solution
 */
export async function solveVRPWithORTools(orders, vehicle, depotLocation) {
  try {
    const ortoolsModule = await import("node_or_tools");
    const ortools = ortoolsModule.default || ortoolsModule;

    // Convert to OR-Tools format
    const { locations, demands, orderIndexMap } = convertOrdersToORTools(
      orders,
      depotLocation
    );

    // Build distance matrix using Haversine formula (2D array)
    const distanceMatrix = buildDistanceMatrix(locations);

    // Get vehicle capacity (ensure integer for OR-Tools)
    const vehicleCapacity = Math.round(
      vehicle?.max_weight || vehicle?.max_volume || 1000
    );

    // OR-Tools expects costs and durations as 2D arrays of integers
    // Format: costs[from][to] where from and to are node indices
    // Ensure all values are integers (OR-Tools requirement)
    const costs = distanceMatrix.map((row) =>
      row.map((value) => Math.round(value))
    ); // Use distance as cost, ensure integers

    // Build durations matrix: estimate travel time + service time
    // Assume 10 m/s average speed (36 km/h) + 5 min service time per order
    const serviceTimeSeconds = 300; // 5 minutes
    const durations = distanceMatrix.map((row, fromIndex) =>
      row.map((distanceMeters, toIndex) => {
        if (fromIndex === toIndex) return 0;
        // Travel time in seconds (distance in meters / speed in m/s)
        const travelTime = Math.round(distanceMeters / 10);
        // Add service time only when arriving at a customer (not depot)
        const duration =
          toIndex === 0 ? travelTime : travelTime + serviceTimeSeconds;
        return Math.round(duration); // Ensure integer
      })
    );

    // Time windows: full day for all locations (no constraints)
    // Ensure all values are integers
    const timeWindows = locations
      .map(() => [0, 86400])
      .map((tw) => tw.map((v) => Math.round(v))); // [start, end] in seconds

    // Validate all arrays are proper 2D arrays of numbers
    const validate2DArray = (arr, name, expectedRowLength = null) => {
      if (!Array.isArray(arr)) {
        throw new Error(`${name} is not an array`);
      }
      if (!arr.every((row) => Array.isArray(row))) {
        throw new Error(`${name} is not a 2D array`);
      }
      if (!arr.every((row) => row.every((cell) => typeof cell === "number"))) {
        throw new Error(`${name} contains non-numeric values`);
      }
      if (expectedRowLength !== null) {
        if (!arr.every((row) => row.length === expectedRowLength)) {
          throw new Error(
            `${name} rows have inconsistent lengths (expected ${expectedRowLength})`
          );
        }
      } else {
        // For arrays where all rows should have same length as locations
        if (!arr.every((row) => row.length === locations.length)) {
          throw new Error(
            `${name} rows have inconsistent lengths (expected ${locations.length})`
          );
        }
      }
    };

    validate2DArray(costs, "costs", locations.length);
    validate2DArray(durations, "durations", locations.length);
    validate2DArray(timeWindows, "timeWindows", 2); // Each timeWindow is [start, end]
    validate2DArray(demands, "demands", locations.length);

    // Initialize OR-Tools VRP solver
    const VRP = new ortools.VRP({
      numNodes: locations.length,
      costs: costs, // 2D array: costs[from][to]
      durations: durations, // 2D array: durations[from][to]
      timeWindows: timeWindows, // 2D array: timeWindows[at] = [start, end]
      demands: demands, // 2D array: demands[at][to] (to is unused)
    });

    // Solve the VRP (callback-based API)
    // Ensure all numeric values are integers (OR-Tools requirement)
    const searchOptions = {
      computeTimeLimit: Math.round(10000), // 10 seconds in milliseconds
      numVehicles: Math.round(1), // Single vehicle per driver
      depotNode: Math.round(0), // Depot is always at index 0
      timeHorizon: Math.round(86400), // Full day (24 hours in seconds)
      vehicleCapacity: Math.round(vehicleCapacity), // Ensure integer
      routeLocks: [[]], // No locked routes (empty array per vehicle)
      pickups: [], // No pickup-delivery pairs
      deliveries: [], // No pickup-delivery pairs
    };

    // Wrap in timeout to prevent hanging (especially in tests)
    const timeout = process.env.NODE_ENV === 'test' ? 5000 : 30000;
    
    return Promise.race([
      new Promise((resolve, reject) => {
        VRP.Solve(searchOptions, (err, solution) => {
          if (err) {
            reject(new Error(`OR-Tools solver error: ${err.message}`));
            return;
          }

          if (!solution) {
            reject(new Error("OR-Tools returned no solution"));
            return;
          }

          // Return solution with order mapping for later parsing
          resolve({
            solution,
            orderIndexMap, // Map: original order index -> OR-Tools location index
            distanceMatrix, // Keep for distance calculations
            locations, // Keep for distance calculations
          });
        });
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`OR-Tools solver timeout after ${timeout}ms`)),
          timeout
        )
      ),
    ]);
  } catch (error) {
    if (error.message.includes("Cannot find module")) {
      throw new Error(
        "node_or_tools package not found. Run: npm install node_or_tools"
      );
    }
    throw error;
  }
}

/**
 * Parse OR-Tools solution and extract optimized route
 * @param {Object} solverResult - Result from solveVRPWithORTools
 * @param {Array} orders - Original orders array (to map back)
 * @returns {Object} Parsed route with order sequence and distances
 */
export function parseORToolsResponse(solverResult, orders) {
  const { solution, orderIndexMap, distanceMatrix, locations } = solverResult;

  if (!solution.routes || solution.routes.length === 0) {
    throw new Error("OR-Tools returned no routes");
  }

  // Solution format: { routes: [[node1, node2, ...], ...], times: [[...], ...] }
  // routes[vehicleIndex] = array of node indices in order (depot not included)
  const routeNodes = solution.routes[0] || []; // First (and only) vehicle route

  // Extract order sequence
  // Route nodes are already customer nodes (depot is excluded from route)
  const optimizedOrders = [];
  let totalDistance = 0; // in meters
  let previousNodeIndex = 0; // Start from depot (index 0)

  // Process route nodes (all are customer nodes, depot is implicit)
  for (let i = 0; i < routeNodes.length; i++) {
    const nodeIndex = routeNodes[i];

    // Map OR-Tools location index back to original order index
    // OR-Tools index 1 = order index 0, OR-Tools index 2 = order index 1, etc.
    const originalOrderIndex = nodeIndex - 1;

    if (originalOrderIndex >= 0 && originalOrderIndex < orders.length) {
      const order = orders[originalOrderIndex];

      // Calculate distance from previous node (depot for first, previous order for others)
      const distanceFromPrev =
        distanceMatrix[previousNodeIndex][nodeIndex] || 0;
      totalDistance += distanceFromPrev;

      optimizedOrders.push({
        orderId: order.id,
        orderNumber: order.order_number,
        rank: optimizedOrders.length + 1,
        distanceFromPrev: distanceFromPrev / 1000, // Convert meters to km
      });

      previousNodeIndex = nodeIndex; // Update for next iteration
    }
  }

  // Add return distance to depot
  if (routeNodes.length > 0) {
    const lastNodeIndex = routeNodes[routeNodes.length - 1];
    const returnDistance = distanceMatrix[lastNodeIndex][0] || 0; // Distance from last node to depot
    totalDistance += returnDistance;
  }

  // Estimate duration: assume average speed of 30 km/h (8.33 m/s)
  const totalDistanceKm = totalDistance / 1000;
  const estimatedDuration = Math.round((totalDistanceKm / 30) * 3600); // seconds

  return {
    totalDistance: totalDistanceKm, // km
    totalDuration: estimatedDuration, // seconds (estimated)
    orders: optimizedOrders,
    rawResponse: solution, // Keep for debugging
  };
}
