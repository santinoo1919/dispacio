/**
 * Custom hook for computing order counts per driver
 * Single Responsibility: Calculate order statistics
 */

import { useMemo } from "react";
import { Order } from "@/lib/types";
import { DRIVERS } from "@/lib/data/drivers";

export function useOrderCounts(orders: Order[]) {
  return useMemo(() => {
    const counts: Record<string, number> = {};
    
    DRIVERS.forEach((driver) => {
      counts[driver.id] = orders.filter((o) => o.driverId === driver.id).length;
    });
    
    // Count unassigned orders for "All" tab
    counts["unassigned"] = orders.filter((o) => !o.driverId).length;
    
    return counts;
  }, [orders]);
}

