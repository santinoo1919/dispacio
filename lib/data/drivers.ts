/**
 * Hardcoded drivers for dispatch assignment
 */

import { Driver } from "../types";

// Map hardcoded driver IDs to backend driver UUIDs
// TODO: Fetch drivers from backend API instead
const DRIVER_ID_MAP: Record<string, string> = {
  driver_1: "200aaa1f-a023-4af0-ad5e-5476b6b6f42d", // John Smith
  driver_2: "4e46fed3-242e-4fa5-897c-ce0e64a7a1fa", // Sarah Johnson
  driver_3: "09c3f149-366a-4fd1-80b8-ad4a63222600", // Mike Williams
};

export const DRIVERS: Driver[] = [
  {
    id: "driver_1",
    name: "John Smith",
    phone: "+971501234567",
    initials: "JS",
    location: { lat: 25.2048, lng: 55.2708 }, // Dubai Marina
  },
  {
    id: "driver_2",
    name: "Sarah Johnson",
    phone: "+971502345678",
    initials: "SJ",
    location: { lat: 25.1972, lng: 55.2744 }, // JBR
  },
  {
    id: "driver_3",
    name: "Mike Williams",
    phone: "+971503456789",
    initials: "MW",
    location: { lat: 25.2764, lng: 55.2962 }, // Business Bay
  },
];

/**
 * Convert frontend driver ID to backend UUID
 */
export function getBackendDriverId(frontendDriverId: string): string | null {
  return DRIVER_ID_MAP[frontendDriverId] || null;
}

/**
 * Convert backend driver UUID to frontend driver ID
 */
export function getFrontendDriverId(backendDriverId: string | null | undefined): string | null {
  if (!backendDriverId) return null;
  // Reverse lookup: find frontend ID by backend UUID
  const entry = Object.entries(DRIVER_ID_MAP).find(([_, uuid]) => uuid === backendDriverId);
  return entry ? entry[0] : null;
}

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
