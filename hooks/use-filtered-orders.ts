/**
 * Custom hook for filtering orders by selected driver
 * Single Responsibility: Filter orders based on driver selection
 */

import { useMemo } from "react";
import { Order } from "@/lib/types";

export function useFilteredOrders(
  orders: Order[],
  selectedDriverId: string | null
) {
  return useMemo(() => {
    if (selectedDriverId === null) {
      // Show only unassigned orders in "All" tab
      return orders.filter((order) => !order.driverId);
    }
    return orders.filter((order) => order.driverId === selectedDriverId);
  }, [orders, selectedDriverId]);
}

