/**
 * WhatsApp sharing utilities for dispatch orders
 */

import { Order } from "@/lib/types";
import { Driver } from "@/lib/types";
import * as Linking from "expo-linking";

export function generateMapsLink(
  address: string,
  lat?: number,
  lng?: number
): string {
  if (lat && lng) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function formatOrderForWhatsApp(
  order: Order,
  stopNumber: number,
  totalStops: number
): string {
  const parts: string[] = [];
  parts.push(`Stop ${stopNumber} of ${totalStops}:`);
  parts.push(`👤 Customer: ${order.customerName}`);
  
  const mapsLink = generateMapsLink(order.address, order.latitude, order.longitude);
  parts.push(`📍 Address: ${mapsLink}`);
  
  if (order.amount) {
    parts.push(`💰 Amount: DH ${order.amount.toFixed(2)}`);
  }
  if (order.items) {
    parts.push(`📦 Items: ${order.items}`);
  }
  if (order.phone) {
    parts.push(`📞 Phone: ${order.phone}`);
  }
  if (order.notes) {
    parts.push(`📝 Notes: ${order.notes}`);
  }
  
  return parts.join("\n");
}

export function generateWhatsAppMessage(
  driver: Driver,
  orders: Order[]
): string {
  if (orders.length === 0) {
    return `📦 No orders assigned to ${driver.name}`;
  }

  const sortedOrders = [...orders].sort((a, b) => a.rank - b.rank);
  const parts: string[] = [];
  parts.push(`📦 Dispatch Route - ${driver.name}\n`);
  parts.push(""); // Extra space after header

  sortedOrders.forEach((order, index) => {
    parts.push(formatOrderForWhatsApp(order, index + 1, sortedOrders.length));
    parts.push(""); // Empty line between orders
    parts.push(""); // Extra space for better separation
  });

  return parts.join("\n");
}

export async function shareToWhatsApp(
  phoneNumber: string,
  message: string
): Promise<void> {
  const formattedPhone = phoneNumber.startsWith("+")
    ? phoneNumber.substring(1)
    : phoneNumber;

  const whatsappUrl = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;

  try {
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      await Linking.openURL(whatsappUrl);
    } else {
      const webUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
      await Linking.openURL(webUrl);
    }
  } catch (error) {
    throw new Error("Failed to open WhatsApp. Please make sure WhatsApp is installed.");
  }
}


