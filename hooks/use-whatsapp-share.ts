/**
 * Custom hook for WhatsApp sharing functionality
 * Single Responsibility: Handle WhatsApp sharing logic
 */

import { useCallback } from "react";
import { Order } from "@/lib/types";
import { getDriversService } from "@/lib/domains/drivers/drivers.service";
import {
  generateWhatsAppMessage,
  shareToWhatsApp,
} from "@/lib/utils/whatsapp-share";

import type { Driver } from "@/lib/domains/drivers/drivers.types";

interface UseWhatsAppShareProps {
  selectedDriverId: string | null;
  filteredOrders: Order[];
  drivers?: Driver[];
}

export function useWhatsAppShare({
  selectedDriverId,
  filteredOrders,
  drivers,
}: UseWhatsAppShareProps) {
  const driversService = getDriversService();

  const handleShare = useCallback(async () => {
    if (!selectedDriverId || filteredOrders.length === 0) return;

    // Try to find driver in provided list first
    let driver = drivers?.find((d) => d.id === selectedDriverId);
    
    // If not found, fetch from service
    if (!driver) {
      driver = await driversService.getDriverById(selectedDriverId);
    }
    
    if (!driver) return;

    try {
      const message = generateWhatsAppMessage(driver, filteredOrders);
      await shareToWhatsApp(driver.phone, message);
    } catch (error) {
      console.error("Failed to share:", error);
      // TODO: Show user-friendly error message
    }
  }, [selectedDriverId, filteredOrders, drivers, driversService]);

  return { handleShare };
}

