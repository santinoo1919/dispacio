/**
 * Drivers Transformer
 * Converts between backend API format and domain format
 */

import type { ApiDriver, Driver } from "./drivers.types";

/**
 * Generate initials from a name
 * Takes first letter of each word, up to 2 characters
 */
function generateInitials(name: string): string {
  if (!name) return "—";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Transform backend API driver format to domain format
 */
export function toDomain(apiDriver: ApiDriver): Driver {
  return {
    id: apiDriver.id, // Use backend UUID directly
    name: apiDriver.name,
    phone: apiDriver.phone,
    email: apiDriver.email,
    // Generate initials if not provided
    initials: apiDriver.initials || generateInitials(apiDriver.name),
    color: apiDriver.color,
    location: apiDriver.location,
    isActive: apiDriver.is_active,
    createdAt: apiDriver.created_at,
    updatedAt: apiDriver.updated_at,
  };
}

/**
 * Transform domain driver format to API request format
 */
export function toApi(
  driver: Partial<Driver>
): {
  name?: string;
  phone?: string;
  email?: string;
  initials?: string;
  color?: string;
  location?: { lat: number; lng: number };
  is_active?: boolean;
} {
  const api: any = {};
  if (driver.name !== undefined) api.name = driver.name;
  if (driver.phone !== undefined) api.phone = driver.phone;
  if (driver.email !== undefined) api.email = driver.email;
  if (driver.initials !== undefined) api.initials = driver.initials;
  if (driver.color !== undefined) api.color = driver.color;
  if (driver.location !== undefined) api.location = driver.location;
  if (driver.isActive !== undefined) api.is_active = driver.isActive;
  return api;
}

/**
 * Transform multiple API drivers to domain drivers
 */
export function toDomainMany(apiDrivers: ApiDriver[]): Driver[] {
  return apiDrivers.map(toDomain);
}

