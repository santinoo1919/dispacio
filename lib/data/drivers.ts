/**
 * Hardcoded drivers for dispatch assignment
 */

import { Driver } from "../types";

export const DRIVERS: Driver[] = [
  {
    id: "driver_1",
    name: "Ahmed Hassan",
    phone: "+971501234567",
    initials: "AH",
  },
  {
    id: "driver_2",
    name: "Mohammed Ali",
    phone: "+971502345678",
    initials: "MA",
  },
  {
    id: "driver_3",
    name: "Khalid Ibrahim",
    phone: "+971503456789",
    initials: "KI",
  },
];

// Driver colors for visual consistency across dispatch UI and map
export const DRIVER_COLORS = [
  "#3B82F6", // Blue - Driver 1 (AH)
  "#10B981", // Green - Driver 2 (MA)
  "#F59E0B", // Orange - Driver 3 (KI)
];

const UNASSIGNED_COLOR = "#9CA3AF"; // Gray for unassigned orders

/**
 * Get color for a driver by their ID
 * Returns gray for unassigned orders
 */
export function getDriverColor(driverId?: string | null): string {
  if (!driverId) return UNASSIGNED_COLOR;

  const driverIndex = DRIVERS.findIndex((driver) => driver.id === driverId);
  if (driverIndex === -1) return UNASSIGNED_COLOR;

  return DRIVER_COLORS[driverIndex % DRIVER_COLORS.length];
}

export function getDriverById(id: string): Driver | undefined {
  return DRIVERS.find((driver) => driver.id === id);
}
