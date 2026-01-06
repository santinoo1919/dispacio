/**
 * React Query hooks for orders
 * Handles fetching, creating, updating, and deleting orders
 */

import { getBackendDriverId } from "@/lib/data/drivers";
import {
  bulkAssignDriver,
  createOrders,
  deleteOrder,
  fetchOrder,
  fetchOrders,
  isConflictError,
  updateOrder,
} from "@/lib/services/api";
import { transformOrder } from "@/lib/transformers/orders";
import { showToast } from "@/lib/utils/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
        backendDriverId = getBackendDriverId(driverId) || undefined;
      }

      const apiOrders = await fetchOrders(backendDriverId);
      return apiOrders.map(transformOrder);
    },
  });
}

/**
 * Fetch a single order by ID
 * @param orderId Order UUID from backend (serverId)
 */
export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ["orders", orderId],
    queryFn: async () => {
      const apiOrder = await fetchOrder(orderId);
      return transformOrder(apiOrder);
    },
    enabled: !!orderId,
  });
}

/**
 * Bulk create orders from CSV
 */
export function useCreateOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orders: Parameters<typeof createOrders>[0]) => {
      return createOrders(orders);
    },
    onSuccess: (data) => {
      // Invalidate orders and zones to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["zones"] });
      showToast.success(
        "Success!",
        `Uploaded ${data.created} orders. Found ${data.orders.length} total orders.`
      );
    },
    onError: (error) => {
      showToast.error(
        "Upload Error",
        error instanceof Error ? error.message : "Failed to upload orders"
      );
    },
  });
}

/**
 * Update a single order with optimistic locking support
 */
export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      updates,
    }: {
      orderId: string;
      updates: Parameters<typeof updateOrder>[1];
    }) => {
      return updateOrder(orderId, updates);
    },
    onSuccess: (data, variables) => {
      // Invalidate specific order and all orders
      queryClient.invalidateQueries({
        queryKey: ["orders", variables.orderId],
      });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["zones"] });
    },
    onError: (error) => {
      // Handle version conflict specifically
      if (isConflictError(error)) {
        showToast.error(
          "Conflict Detected",
          "This order was modified by someone else. Refreshing data..."
        );
        // Invalidate to refetch latest data
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        queryClient.invalidateQueries({ queryKey: ["zones"] });
        return;
      }

      showToast.error(
        "Update Error",
        error instanceof Error ? error.message : "Failed to update order"
      );
    },
  });
}

/**
 * Bulk assign driver to multiple orders
 */
export function useBulkAssignDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderIds,
      driverId,
    }: {
      orderIds: string[];
      driverId: string; // Frontend driver ID
    }) => {
      const backendDriverId = getBackendDriverId(driverId);
      if (!backendDriverId) {
        throw new Error(`No backend driver ID found for ${driverId}`);
      }
      return bulkAssignDriver(orderIds, backendDriverId);
    },
    onSuccess: () => {
      // Invalidate orders and zones to refetch with updated driver assignments
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["zones"] });
    },
    onError: (error) => {
      showToast.error(
        "Assignment Error",
        error instanceof Error ? error.message : "Failed to assign driver"
      );
    },
  });
}

/**
 * Delete an order
 */
export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      return deleteOrder(orderId);
    },
    onMutate: async (orderId) => {
      // Optimistic update: Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["orders"] });
      await queryClient.cancelQueries({ queryKey: ["zones"] });

      // Snapshot previous values for rollback
      const previousOrders = queryClient.getQueryData(["orders"]);
      const previousZones = queryClient.getQueryData(["zones"]);

      // Optimistically remove order from cache
      queryClient.setQueryData(["orders"], (old: any) => {
        if (!old) return old;
        return old.filter(
          (o: any) => o.serverId !== orderId && o.id !== orderId
        );
      });

      // Optimistically update zones
      queryClient.setQueryData(["zones"], (old: any) => {
        if (!old) return old;
        return old.map((zone: any) => ({
          ...zone,
          orders: zone.orders.filter(
            (o: any) => o.serverId !== orderId && o.id !== orderId
          ),
          orderCount: zone.orders.filter(
            (o: any) => o.serverId !== orderId && o.id !== orderId
          ).length,
        }));
      });

      return { previousOrders, previousZones };
    },
    onError: (error, orderId, context) => {
      // Rollback on error
      if (context?.previousOrders) {
        queryClient.setQueryData(["orders"], context.previousOrders);
      }
      if (context?.previousZones) {
        queryClient.setQueryData(["zones"], context.previousZones);
      }
      showToast.error(
        "Delete Error",
        error instanceof Error ? error.message : "Failed to delete order"
      );
    },
    onSuccess: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["zones"] });
      showToast.success("Order Deleted", "Order removed successfully");
    },
  });
}
