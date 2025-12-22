/**
 * React Query hooks for route optimization
 * Handles optimizing routes using OR-Tools
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getBackendDriverId } from "@/lib/data/drivers";
import { optimizeRoute } from "@/lib/services/api";
import { showToast } from "@/lib/utils/toast";

/**
 * Optimize route for a driver
 */
export function useOptimizeRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      driverId,
      orderIds,
    }: {
      driverId: string; // Frontend driver ID
      orderIds?: string[];
    }) => {
      const backendDriverId = getBackendDriverId(driverId);
      if (!backendDriverId) {
        throw new Error(`No backend driver ID found for ${driverId}`);
      }
      return optimizeRoute(backendDriverId, orderIds);
    },
    onSuccess: (data) => {
      // Invalidate orders to get updated ranks
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["zones"] });
      showToast.success(
        "Route Optimized",
        `Total distance: ${data.totalDistance.toFixed(1)} km`
      );
    },
    onError: (error) => {
      showToast.error(
        "Optimization Error",
        error instanceof Error ? error.message : "Failed to optimize route"
      );
    },
  });
}

