/**
 * React Query mutation hooks for zones
 * Handles creating zones and assigning drivers to zones
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getBackendDriverId } from "@/lib/data/drivers";
import { assignDriverToZone, createZones } from "@/lib/services/api";
import { Zone } from "@/lib/types";
import { showToast } from "@/lib/utils/toast";

/**
 * Create zones from clustering
 */
export function useCreateZones() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (zones: Parameters<typeof createZones>[0]) => {
      return createZones(zones);
    },
    onSuccess: (data) => {
      // Invalidate zones and orders to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ["zones"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      showToast.success(
        "Zones Created",
        `Created ${data.created} zones successfully`
      );
    },
    onError: (error) => {
      showToast.error(
        "Zone Creation Error",
        error instanceof Error ? error.message : "Failed to create zones"
      );
    },
  });
}

/**
 * Assign driver to all orders in a zone
 * Uses optimistic update for instant UI feedback
 */
export function useAssignDriverToZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      zoneId,
      driverId,
    }: {
      zoneId: string; // Frontend zone ID (display name)
      driverId: string; // Frontend driver ID
    }) => {
      // Get zone to find serverId
      const zones = queryClient.getQueryData<Zone[]>(["zones"]);
      const zone = zones?.find((z) => z.id === zoneId || z.serverId === zoneId);
      if (!zone?.serverId) {
        throw new Error(`Zone ${zoneId} not found or missing serverId`);
      }

      const backendDriverId = getBackendDriverId(driverId);
      if (!backendDriverId) {
        throw new Error(`No backend driver ID found for ${driverId}`);
      }

      return assignDriverToZone(zone.serverId, backendDriverId);
    },
    onMutate: async ({ zoneId, driverId }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["zones"] });
      await queryClient.cancelQueries({ queryKey: ["orders"] });

      // Snapshot previous values for rollback
      const previousZones = queryClient.getQueryData<Zone[]>(["zones"]);
      const previousOrders = queryClient.getQueryData<any[]>(["orders"]);

      // Optimistically update zones
      queryClient.setQueryData<Zone[]>(["zones"], (old) => {
        if (!old) return old;
        return old.map((zone) => {
          if (zone.id === zoneId || zone.serverId === zoneId) {
            return {
              ...zone,
              assignedDriverId: driverId,
              orders: zone.orders.map((order) => ({
                ...order,
                driverId,
              })),
            };
          }
          return zone;
        });
      });

      // Optimistically update orders
      queryClient.setQueryData<any[]>(["orders"], (old) => {
        if (!old) return old;
        const zone = previousZones?.find(
          (z) => z.id === zoneId || z.serverId === zoneId
        );
        if (!zone) return old;

        const orderIds = new Set(zone.orders.map((o) => o.id));
        return old.map((order) => {
          if (orderIds.has(order.id)) {
            return { ...order, driverId };
          }
          return order;
        });
      });

      return { previousZones, previousOrders };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousZones) {
        queryClient.setQueryData(["zones"], context.previousZones);
      }
      if (context?.previousOrders) {
        queryClient.setQueryData(["orders"], context.previousOrders);
      }
      showToast.error(
        "Assignment Error",
        error instanceof Error ? error.message : "Failed to assign driver to zone"
      );
    },
    onSuccess: () => {
      // Refetch to ensure consistency with backend
      queryClient.invalidateQueries({ queryKey: ["zones"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      showToast.success("Driver Assigned", "Driver assigned to zone successfully");
    },
  });
}

