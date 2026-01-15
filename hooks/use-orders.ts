/**
 * React Query hooks for orders
 * Thin layer that wraps OrdersService with React Query
 */

import { getOrdersService } from "@/lib/domains/orders/orders.service";
import { isConflictError } from "@/lib/domains/orders/orders.errors";
import type { Order } from "@/lib/domains/orders/orders.types";
import { showToast } from "@/lib/utils/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Fetch all orders or filtered by driver
 * @param driverId Optional frontend driver ID to filter orders
 */
export function useOrders(driverId?: string) {
  const ordersService = getOrdersService();

  return useQuery({
    queryKey: driverId ? ["orders", driverId] : ["orders"],
    queryFn: () => ordersService.getOrders(driverId),
  });
}

/**
 * Fetch a single order by ID
 * @param orderId Order UUID from backend (serverId)
 */
export function useOrder(orderId: string) {
  const ordersService = getOrdersService();

  return useQuery({
    queryKey: ["orders", orderId],
    queryFn: () => ordersService.getOrder(orderId),
    enabled: !!orderId,
  });
}

/**
 * Bulk create orders from CSV
 */
export function useCreateOrders() {
  const queryClient = useQueryClient();
  const ordersService = getOrdersService();

  return useMutation({
    mutationFn: async (orders: Order[]) => {
      return ordersService.createOrders(orders);
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
  const ordersService = getOrdersService();

  return useMutation({
    mutationFn: async ({
      orderId,
      updates,
    }: {
      orderId: string;
      updates: Partial<Order>;
    }) => {
      return ordersService.updateOrder(orderId, updates);
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
  const ordersService = getOrdersService();

  return useMutation({
    mutationFn: async ({
      orderIds,
      driverId,
    }: {
      orderIds: string[];
      driverId: string; // Backend driver UUID
    }) => {
      return ordersService.assignDriverToOrders(orderIds, driverId);
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
  const ordersService = getOrdersService();

  return useMutation({
    mutationFn: async (orderId: string) => {
      return ordersService.deleteOrder(orderId);
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
