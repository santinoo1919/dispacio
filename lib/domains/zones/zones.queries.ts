/**
 * React Query hooks for zones
 * Handles fetching zones, creating zones, and assigning drivers to zones
 */

import { ZoneClusterer } from "@/lib/clustering/zone-clusterer";
import { getZonesService } from "@/lib/domains/zones/zones.service";
import { getOrdersService } from "@/lib/domains/orders/orders.service";
import type { Zone, CreateZoneRequest } from "@/lib/domains/zones/zones.types";
import type { Order } from "@/lib/domains/orders/orders.types";
import { showToast } from "@/lib/utils/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDrivers } from "@/lib/domains/drivers/drivers.queries";
import { queryKeys } from "@/lib/react-query/query-keys";

const zoneClusterer = new ZoneClusterer();

/**
 * Fetch all zones with their orders
 * Auto-creates zones if orders exist but no zones are present
 */
export function useZones() {
  const { data: drivers } = useDrivers({ isActive: true });
  const zonesService = getZonesService();
  const ordersService = getOrdersService();

  return useQuery({
    // Fix: Use driver IDs instead of serializing entire drivers array
    // This prevents serialization bugs and improves cache efficiency
    queryKey: queryKeys.zones.list({
      driverIds: drivers?.map((d) => d.id).sort(),
    }),
    queryFn: async () => {
      // Fetch orders first to populate zone orders
      const orders = await ordersService.getOrders();

      // Fetch zones from service
      let zones = await zonesService.getZones(orders, drivers || []);

      // If no zones exist but orders do, create zones automatically
      if (zones.length === 0 && orders.length > 0) {
        // Auto-create zones for existing orders
        const clusteredZones = zoneClusterer.clusterOrders(orders);
        const zonesToCreate: CreateZoneRequest[] = clusteredZones.map((zone) => ({
          name: zone.id,
          center: zone.center,
          orderIds: zone.orders
            .map((o) => o.serverId)
            .filter(Boolean) as string[],
        }));

        if (zonesToCreate.length > 0) {
          zones = await zonesService.createZones(zonesToCreate);
          // Re-fetch with orders populated
          zones = await zonesService.getZones(orders, drivers || []);
        }
      }

      return zones;
    },
  });
}

/**
 * Create zones from clustering
 */
export function useCreateZones() {
  const queryClient = useQueryClient();
  const zonesService = getZonesService();

  return useMutation({
    mutationFn: async (zones: CreateZoneRequest[]) => {
      return zonesService.createZones(zones);
    },
    onSuccess: (zones) => {
      // Invalidate zones and orders to refetch fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.zones.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      showToast.success(
        "Zones Created",
        `Created ${zones.length} zones successfully`
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
  const zonesService = getZonesService();

  return useMutation({
    mutationFn: async ({
      zoneId,
      driverId,
    }: {
      zoneId: string; // Frontend zone ID (display name) or serverId
      driverId: string; // Backend driver UUID
    }) => {
      // Get zone to find serverId
      const zones = queryClient.getQueryData<Zone[]>(queryKeys.zones.list());
      const zone = zones?.find((z) => z.id === zoneId || z.serverId === zoneId);
      if (!zone?.serverId) {
        throw new Error(`Zone ${zoneId} not found or missing serverId`);
      }

      // Driver ID is now backend UUID directly, no conversion needed
      return zonesService.assignDriverToZone(zone.serverId, driverId);
    },
    onMutate: async ({ zoneId, driverId }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: queryKeys.zones.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.all });

      // Snapshot previous values for rollback
      const previousZones = queryClient.getQueryData<Zone[]>(
        queryKeys.zones.list()
      );
      const previousOrders = queryClient.getQueryData<Order[]>(
        queryKeys.orders.list()
      );

      // Optimistically update zones
      queryClient.setQueryData<Zone[]>(queryKeys.zones.list(), (old) => {
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
      queryClient.setQueryData<Order[]>(queryKeys.orders.list(), (old) => {
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
        queryClient.setQueryData(queryKeys.zones.list(), context.previousZones);
      }
      if (context?.previousOrders) {
        queryClient.setQueryData(
          queryKeys.orders.list(),
          context.previousOrders
        );
      }
      showToast.error(
        "Assignment Error",
        error instanceof Error
          ? error.message
          : "Failed to assign driver to zone"
      );
    },
    onSuccess: () => {
      // NO invalidateQueries needed - we already updated everything optimistically!
      // The cache is already in sync with the backend operation
      showToast.success(
        "Driver Assigned",
        "Driver assigned to zone successfully"
      );
    },
  });
}

