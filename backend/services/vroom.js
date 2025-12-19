/**
 * VROOM Integration Service
 * Converts orders/vehicles to VROOM format and calls VROOM API
 */

const VROOM_URL = process.env.VROOM_URL || "http://localhost:3000";

/**
 * Convert orders to VROOM jobs format
 * @param {Array} orders - Array of order objects from database
 * @returns {Array} VROOM jobs array
 */
export function convertOrdersToVROOM(orders) {
  return orders.map((order, index) => {
    if (!order.latitude || !order.longitude) {
      throw new Error(`Order ${order.order_number} missing coordinates`);
    }

    const job = {
      id: index, // VROOM uses sequential integer IDs
      description: order.order_number || `Order ${index}`,
      location: [order.longitude, order.latitude], // VROOM uses [lng, lat]
    };

    // Add capacity constraints if available
    if (order.package_weight || order.package_volume) {
      job.delivery = [];

      // VROOM capacity: [weight, volume] or just [volume]
      if (order.package_weight) {
        job.delivery.push(order.package_weight);
      }
      if (order.package_volume) {
        job.delivery.push(order.package_volume);
      }

      // If only one dimension, use it for both
      if (job.delivery.length === 1) {
        job.delivery.push(job.delivery[0]);
      }
    }

    // Add time windows if available (future enhancement)
    // if (order.time_window_start && order.time_window_end) {
    //   job.time_windows = [[...]];
    // }

    return job;
  });
}

/**
 * Convert vehicle to VROOM vehicle format
 * @param {Object} vehicle - Vehicle object from database
 * @param {Object} driver - Driver object (for start location)
 * @param {Array} orders - Orders for this driver (to calculate start location)
 * @returns {Object} VROOM vehicle object
 */
export function convertVehicleToVROOM(vehicle, driver, orders) {
  const vroomVehicle = {
    id: 0, // Single vehicle per driver for now
    description: `Vehicle for ${driver.name}`,
  };

  // Set start location (use first order or depot)
  if (orders.length > 0 && orders[0].latitude && orders[0].longitude) {
    vroomVehicle.start = [orders[0].longitude, orders[0].latitude];
  } else {
    // Default to a central location (e.g., warehouse)
    vroomVehicle.start = [55.2708, 25.2048]; // Dubai center
  }

  // End location (same as start for round trip)
  vroomVehicle.end = vroomVehicle.start;

  // Add capacity constraints
  if (vehicle.max_weight || vehicle.max_volume) {
    vroomVehicle.capacity = [];

    if (vehicle.max_weight) {
      vroomVehicle.capacity.push(vehicle.max_weight);
    }
    if (vehicle.max_volume) {
      vroomVehicle.capacity.push(vehicle.max_volume);
    }

    // If only one dimension, use it for both
    if (vroomVehicle.capacity.length === 1) {
      vroomVehicle.capacity.push(vroomVehicle.capacity[0]);
    }
  }

  return vroomVehicle;
}

/**
 * Call VROOM API to optimize route
 * @param {Array} jobs - VROOM jobs array
 * @param {Array} vehicles - VROOM vehicles array
 * @returns {Promise<Object>} VROOM response
 */
export async function callVROOM(jobs, vehicles) {
  const requestBody = {
    jobs,
    vehicles,
    options: {
      g: true, // Return geometry (distance matrix)
    },
  };

  try {
    const response = await fetch(VROOM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`VROOM API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    if (
      error.message.includes("fetch failed") ||
      error.message.includes("ECONNREFUSED")
    ) {
      throw new Error(
        `Cannot connect to VROOM at ${VROOM_URL}. Is VROOM running?`
      );
    }
    throw error;
  }
}

/**
 * Parse VROOM response and extract optimized route
 * @param {Object} vroomResponse - Raw VROOM API response
 * @param {Array} orders - Original orders array (to map back)
 * @returns {Object} Parsed route with order sequence and distances
 */
export function parseVROOMResponse(vroomResponse, orders) {
  if (!vroomResponse.routes || vroomResponse.routes.length === 0) {
    throw new Error("VROOM returned no routes");
  }

  const route = vroomResponse.routes[0];
  const summary = route.summary || {};

  // Extract order sequence from VROOM steps
  const optimizedOrders = [];
  let previousDistance = 0;

  for (const step of route.steps || []) {
    if (step.type === "job" && step.job !== undefined) {
      const jobIndex = step.job;
      const order = orders[jobIndex];

      if (order) {
        // VROOM provides distance from previous step in meters
        const distanceFromPrev = step.distance ? step.distance / 1000 : 0; // Convert to km

        optimizedOrders.push({
          orderId: order.id,
          orderNumber: order.order_number,
          rank: optimizedOrders.length + 1,
          distanceFromPrev: distanceFromPrev,
        });

        previousDistance += distanceFromPrev;
      }
    } else if (step.type === "start" || step.type === "end") {
      // Skip start/end steps (depot)
      continue;
    }
  }

  return {
    totalDistance: (summary.distance || 0) / 1000, // Convert meters to km
    totalDuration: summary.duration || 0, // Seconds
    orders: optimizedOrders,
    rawResponse: vroomResponse, // Keep for debugging
  };
}
