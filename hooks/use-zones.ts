/**
 * React Query hooks for zones
 * Handles fetching zones and auto-creating them if needed
 */

import { ZoneClusterer } from "@/lib/clustering/zone-clusterer";
import { createZones, fetchZones } from "@/lib/services/api";
import { transformOrder } from "@/lib/transformers/orders";
import { transformZone } from "@/lib/transformers/zones";
import { Order } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

const zoneClusterer = new ZoneClusterer();

/**
 * Fetch all zones with their orders
 * Auto-creates zones if orders exist but no zones are present
 */
export function useZones() {
  return useQuery({
    queryKey: ["zones"],
    queryFn: async () => {
      // Fetch zones from backend
      const zonesResponse = await fetchZones();

      // Fetch orders to populate zone orders
      const { fetchOrders } = await import("@/lib/services/api");
      const apiOrders = await fetchOrders();
      const orders: Order[] = apiOrders.map(transformOrder);

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
      return zonesResponse.zones.map((z) => transformZone(z, orders, true));
    },
  });
}
