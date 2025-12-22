/**
 * React Query hooks for orders
 * Handles fetching and transforming orders from backend
 */

import { fetchOrders } from "@/lib/services/api";
import { transformOrder } from "@/lib/transformers/orders";
import { useQuery } from "@tanstack/react-query";

/**
 * Fetch all orders or filtered by driver
 * @param driverId Optional frontend driver ID to filter orders
 */
export function useOrders(driverId?: string) {
  return useQuery({
    queryKey: driverId ? ["orders", driverId] : ["orders"],
    queryFn: async () => {
      // Convert frontend driver ID to backend UUID if filtering
      let backendDriverId: string | undefined;
      if (driverId) {
        const { getBackendDriverId } = await import("@/lib/data/drivers");
        backendDriverId = getBackendDriverId(driverId) || undefined;
      }

      const apiOrders = await fetchOrders(backendDriverId);
      return apiOrders.map(transformOrder);
    },
  });
}

/**
 * Fetch a single order by ID
 * @param orderId Order ID (frontend format)
 */
export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ["orders", orderId],
    queryFn: async () => {
      // For now, fetch all orders and find the one we need
      // TODO: Add single order endpoint to backend
      const apiOrders = await fetchOrders();
      const order = apiOrders.find(
        (o) => o.order_number === orderId || o.id === orderId
      );
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }
      return transformOrder(order);
    },
    enabled: !!orderId,
  });
}
