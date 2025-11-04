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

export function getDriverById(id: string): Driver | undefined {
  return DRIVERS.find((driver) => driver.id === id);
}
