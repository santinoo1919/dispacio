/**
 * Custom hook for WhatsApp sharing functionality
 * Single Responsibility: Handle WhatsApp sharing logic
 */

import { useCallback } from "react";
import { Order } from "@/lib/types";
import { getDriverById } from "@/lib/data/drivers";
import {
  generateWhatsAppMessage,
  shareToWhatsApp,
} from "@/lib/utils/whatsapp-share";

interface UseWhatsAppShareProps {
  selectedDriverId: string | null;
  filteredOrders: Order[];
}

export function useWhatsAppShare({
  selectedDriverId,
  filteredOrders,
}: UseWhatsAppShareProps) {
  const handleShare = useCallback(async () => {
    if (!selectedDriverId || filteredOrders.length === 0) return;

    const driver = getDriverById(selectedDriverId);
    if (!driver) return;

    try {
      const message = generateWhatsAppMessage(driver, filteredOrders);
      await shareToWhatsApp(driver.phone, message);
    } catch (error) {
      console.error("Failed to share:", error);
      // TODO: Show user-friendly error message
    }
  }, [selectedDriverId, filteredOrders]);

  return { handleShare };
}

