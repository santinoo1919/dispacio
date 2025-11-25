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
// Using orange variations as primary accent colors
export const DRIVER_COLORS = [
  "#F97316", // accent-500 - Primary orange - Driver 1 (AH)
  "#FB923C", // accent-400 - Light orange - Driver 2 (MA)
  "#EA580C", // accent-600 - Dark orange - Driver 3 (KI)
];

const UNASSIGNED_COLOR = "#71717A"; // zinc-500 for unassigned orders

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
