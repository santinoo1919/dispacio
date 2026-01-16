/**
 * React Query hooks for route optimization
 * Handles optimizing routes using OR-Tools
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { optimizeRoute } from "@/lib/services/api";
import { showToast } from "@/lib/utils/toast";
import { queryKeys } from "@/lib/react-query/query-keys";

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
      driverId: string; // Backend driver UUID
      orderIds?: string[];
    }) => {
      // Driver ID is now backend UUID directly, no conversion needed
      return optimizeRoute(driverId, orderIds);
    },
    onSuccess: (data) => {
      // Invalidate orders to get updated ranks
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.zones.all });
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

