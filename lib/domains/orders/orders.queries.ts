/**
 * React Query hooks for orders
 * Thin layer that wraps OrdersService with React Query
 */

import { getOrdersService } from "@/lib/domains/orders/orders.service";
import { isConflictError } from "@/lib/domains/orders/orders.errors";
import type { Order } from "@/lib/domains/orders/orders.types";
import { showToast } from "@/lib/utils/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query/query-keys";
import type { Zone } from "@/lib/domains/zones/zones.types";

/**
 * Fetch all orders or filtered by driver
 * @param driverId Optional frontend driver ID to filter orders
 */
export function useOrders(driverId?: string) {
  const ordersService = getOrdersService();

  return useQuery({
    queryKey: queryKeys.orders.list(driverId ? { driverId } : undefined),
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
    queryKey: queryKeys.orders.detail(orderId),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.zones.all });

      // Build informative message
      const parts: string[] = [];
      if (data.created > 0) {
        parts.push(`Created ${data.created} order${data.created !== 1 ? "s" : ""}`);
      }
      if (data.skipped > 0) {
        parts.push(`Skipped ${data.skipped} duplicate${data.skipped !== 1 ? "s" : ""}`);
      }
      if (data.failed > 0) {
        parts.push(`Failed ${data.failed}`);
      }

      const message = parts.length > 0 ? parts.join(", ") : "No orders processed";
      showToast.success("CSV Upload", message);
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
 * Uses setQueryData instead of invalidateQueries for instant UI updates
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
    onMutate: async ({ orderId, updates }) => {
      // Cancel outgoing queries to prevent overwriting optimistic updates
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.zones.all });

      // Snapshot previous values for rollback
      const previousOrder = queryClient.getQueryData<Order>(
        queryKeys.orders.detail(orderId)
      );
      const previousOrders = queryClient.getQueryData<Order[]>(
        queryKeys.orders.list()
      );
      const previousZones = queryClient.getQueryData<Zone[]>(
        queryKeys.zones.list()
      );

      // Optimistically update single order detail
      if (previousOrder) {
        queryClient.setQueryData<Order>(queryKeys.orders.detail(orderId), {
          ...previousOrder,
          ...updates,
        });
      }

      // Optimistically update in orders list
      queryClient.setQueryData<Order[]>(queryKeys.orders.list(), (old) =>
        old?.map((o) =>
          o.id === orderId || o.serverId === orderId
            ? { ...o, ...updates }
            : o
        )
      );

      // Optimistically update in zones
      queryClient.setQueryData<Zone[]>(queryKeys.zones.list(), (old) =>
        old?.map((zone) => ({
          ...zone,
          orders: zone.orders.map((o) =>
            o.id === orderId || o.serverId === orderId
              ? { ...o, ...updates }
              : o
          ),
        }))
      );

      return { previousOrder, previousOrders, previousZones };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousOrder) {
        queryClient.setQueryData(
          queryKeys.orders.detail(variables.orderId),
          context.previousOrder
        );
      }
      if (context?.previousOrders) {
        queryClient.setQueryData(
          queryKeys.orders.list(),
          context.previousOrders
        );
      }
      if (context?.previousZones) {
        queryClient.setQueryData(queryKeys.zones.list(), context.previousZones);
      }

      // Handle version conflict specifically
      if (isConflictError(error)) {
        showToast.error(
          "Conflict Detected",
          "This order was modified by someone else. Refreshing data..."
        );
        // Invalidate to refetch latest data
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.zones.all });
        return;
      }

      showToast.error(
        "Update Error",
        error instanceof Error ? error.message : "Failed to update order"
      );
    },
    onSuccess: (data, variables) => {
      // Update with real data from server (in case server computed something)
      queryClient.setQueryData(
        queryKeys.orders.detail(variables.orderId),
        data
      );

      // Update in list with real data
      queryClient.setQueryData<Order[]>(queryKeys.orders.list(), (old) =>
        old?.map((o) =>
          o.id === variables.orderId || o.serverId === variables.orderId
            ? data
            : o
        )
      );

      // Update in zones with real data
      queryClient.setQueryData<Zone[]>(queryKeys.zones.list(), (old) =>
        old?.map((zone) => ({
          ...zone,
          orders: zone.orders.map((o) =>
            o.id === variables.orderId || o.serverId === variables.orderId
              ? data
              : o
          ),
        }))
      );

      // NO invalidateQueries needed - we already have the data!
    },
  });
}

/**
 * Bulk assign driver to multiple orders
 * Uses optimistic updates for instant UI feedback
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
    onMutate: async ({ orderIds, driverId }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.zones.all });

      // Snapshot previous values for rollback
      const previousOrders = queryClient.getQueryData<Order[]>(
        queryKeys.orders.list()
      );
      const previousZones = queryClient.getQueryData<Zone[]>(
        queryKeys.zones.list()
      );

      // Optimistically update orders
      queryClient.setQueryData<Order[]>(queryKeys.orders.list(), (old) =>
        old?.map((o) =>
          orderIds.includes(o.serverId || o.id) ? { ...o, driverId } : o
        )
      );

      // Optimistically update zones
      queryClient.setQueryData<Zone[]>(queryKeys.zones.list(), (old) =>
        old?.map((zone) => {
          const updatedOrders = zone.orders.map((o) =>
            orderIds.includes(o.serverId || o.id) ? { ...o, driverId } : o
          );
          
          // Update assignedDriverId if all orders in zone have the same driver
          const allOrdersInZoneHaveDriver = updatedOrders.every((o) =>
            orderIds.includes(o.serverId || o.id)
              ? o.driverId === driverId
              : true
          );
          
          return {
            ...zone,
            orders: updatedOrders,
            assignedDriverId:
              allOrdersInZoneHaveDriver &&
              updatedOrders.every((o) => o.driverId === driverId)
                ? driverId
                : zone.assignedDriverId,
          };
        })
      );

      return { previousOrders, previousZones };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousOrders) {
        queryClient.setQueryData(
          queryKeys.orders.list(),
          context.previousOrders
        );
      }
      if (context?.previousZones) {
        queryClient.setQueryData(queryKeys.zones.list(), context.previousZones);
      }
      showToast.error(
        "Assignment Error",
        error instanceof Error ? error.message : "Failed to assign driver"
      );
    },
    onSuccess: () => {
      // NO invalidateQueries needed - we already updated everything optimistically!
      showToast.success(
        "Driver Assigned",
        "Driver assigned to orders successfully"
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
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.zones.all });

      // Snapshot previous values for rollback
      const previousOrders = queryClient.getQueryData<Order[]>(
        queryKeys.orders.list()
      );
      const previousZones = queryClient.getQueryData<Zone[]>(
        queryKeys.zones.list()
      );

      // Optimistically remove order from cache
      queryClient.setQueryData<Order[]>(queryKeys.orders.list(), (old) => {
        if (!old) return old;
        return old.filter((o) => o.serverId !== orderId && o.id !== orderId);
      });

      // Optimistically update zones
      queryClient.setQueryData<Zone[]>(queryKeys.zones.list(), (old) => {
        if (!old) return old;
        return old.map((zone) => {
          const filteredOrders = zone.orders.filter(
            (o) => o.serverId !== orderId && o.id !== orderId
          );
          return {
            ...zone,
            orders: filteredOrders,
            orderCount: filteredOrders.length,
          };
        });
      });

      return { previousOrders, previousZones };
    },
    onError: (error, orderId, context) => {
      // Rollback on error
      if (context?.previousOrders) {
        queryClient.setQueryData(
          queryKeys.orders.list(),
          context.previousOrders
        );
      }
      if (context?.previousZones) {
        queryClient.setQueryData(queryKeys.zones.list(), context.previousZones);
      }
      showToast.error(
        "Delete Error",
        error instanceof Error ? error.message : "Failed to delete order"
      );
    },
    onSuccess: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.zones.all });
      showToast.success("Order Deleted", "Order removed successfully");
    },
  });
}

