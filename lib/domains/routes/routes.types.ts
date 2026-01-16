/**
 * Routes Domain Types
 * Types for route optimization functionality
 */

/**
 * Response from route optimization endpoint
 */
export interface OptimizeRouteResponse {
  success: boolean;
  driverId: string;
  totalDistance: number;
  totalDuration: number;
  orders: {
    orderId: string;
    orderNumber: string;
    rank: number;
    distanceFromPrev: number;
  }[];
}

