/**
 * React Query hooks for zones
 * Handles fetching zones, creating zones, and assigning drivers to zones
 */

import { ZoneClusterer } from "@/lib/clustering/zone-clusterer";
import {
  assignDriverToZone,
  createZones,
  fetchZones,
} from "@/lib/services/api";
import { toDomainMany } from "@/lib/domains/orders/orders.transformer";
import { transformZone } from "@/lib/transformers/zones";
import type { Order } from "@/lib/domains/orders/orders.types";
import { Zone } from "@/lib/types";
import { showToast } from "@/lib/utils/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const zoneClusterer = new ZoneClusterer();

/**
 * Fetch all zones with their orders
 * Auto-creates zones if orders exist but no zones are present
 */
export function useZones() {
  const { data: drivers } = useDrivers({ isActive: true });

  return useQuery({
    queryKey: ["zones", drivers],
    queryFn: async () => {
      // Fetch zones from backend
      const zonesResponse = await fetchZones();

      // Fetch orders to populate zone orders
      const { getOrdersService } = await import("@/lib/domains/orders/orders.service");
      const ordersService = getOrdersService();
      const orders: Order[] = await ordersService.getOrders();

      // If no zones exist but orders do, create zones automatically
      if (zonesResponse.zones.length === 0 && orders.length > 0) {
        // Auto-create zones for existing orders
        const clusteredZones = zoneClusterer.clusterOrders(orders);
        const zonesToCreate = clusteredZones.map((zone) => ({
          name: zone.id,
          center: zone.center,
          orderIds: zone.orders
            .map((o) => o.serverId)
            .filter(Boolean) as string[],
        }));

        if (zonesToCreate.length > 0) {
          const createResult = await createZones(zonesToCreate);
          // Convert created zones to frontend format using transformer
          const newZones = createResult.zones.map((z) =>
            transformZone(z, orders)
          );
          return newZones;
        }
      }

      // Convert backend zones to frontend format
      // Pass drivers for auto-assignment if available
      const driversForTransform = drivers
        ? drivers.map((d) => ({
            id: d.id,
            location: d.location || undefined,
          }))
        : undefined;
      return zonesResponse.zones.map((z) =>
        transformZone(z, orders, true, driversForTransform)
      );
    },
  });
}

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
      driverId: string; // Backend driver UUID
    }) => {
      // Get zone to find serverId
      const zones = queryClient.getQueryData<Zone[]>(["zones"]);
      const zone = zones?.find((z) => z.id === zoneId || z.serverId === zoneId);
      if (!zone?.serverId) {
        throw new Error(`Zone ${zoneId} not found or missing serverId`);
      }

      // Driver ID is now backend UUID directly, no conversion needed
      return assignDriverToZone(zone.serverId, driverId);
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
        error instanceof Error
          ? error.message
          : "Failed to assign driver to zone"
      );
    },
    onSuccess: () => {
      // Refetch to ensure consistency with backend
      queryClient.invalidateQueries({ queryKey: ["zones"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      showToast.success(
        "Driver Assigned",
        "Driver assigned to zone successfully"
      );
    },
  });
}
