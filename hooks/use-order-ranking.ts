/**
 * Custom hook for handling order ranking/dragging logic
 * Single Responsibility: Manage order rank updates
 */

import { Order } from "@/lib/types";
import * as Haptics from "expo-haptics";

interface UseOrderRankingProps {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  selectedDriverId: string | null;
}

export function useOrderRanking({
  orders,
  setOrders,
  selectedDriverId,
}: UseOrderRankingProps) {
  const handleDragEnd = ({ data }: { data: Order[] }) => {
    // Update ranks based on new position (within current filter context)
    const updatedFiltered = data.map((order, index) => ({
      ...order,
      rank: index + 1,
    }));

    // If filtering by driver, update ranks only for that driver's orders
    // Otherwise update all orders
    const updatedOrders = orders.map((order) => {
      if (selectedDriverId !== null && order.driverId !== selectedDriverId) {
        return order; // Don't touch orders from other drivers
      }

      const updated = updatedFiltered.find((o) => o.id === order.id);
      return updated || order;
    });

    setOrders(updatedOrders);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return { handleDragEnd };
}

