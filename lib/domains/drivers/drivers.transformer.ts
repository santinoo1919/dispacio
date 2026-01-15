/**
 * Drivers Transformer
 * Converts between backend API format and domain format
 */

import type {
  ApiDriver,
  Driver,
  CreateDriverRequest,
  UpdateDriverRequest,
} from "./drivers.types";

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
 * Transform CreateDriverRequest to API format
 * This is a pass-through since CreateDriverRequest already matches API format
 */
export function createRequestToApi(
  request: CreateDriverRequest
): CreateDriverRequest {
  return request;
}

/**
 * Transform UpdateDriverRequest to API format
 * This is a pass-through since UpdateDriverRequest already matches API format
 */
export function updateRequestToApi(
  request: UpdateDriverRequest
): UpdateDriverRequest {
  return request;
}

/**
 * Transform multiple API drivers to domain drivers
 */
export function toDomainMany(apiDrivers: ApiDriver[]): Driver[] {
  return apiDrivers.map(toDomain);
}

