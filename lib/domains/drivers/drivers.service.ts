/**
 * Drivers Service
 * Business logic layer for drivers domain
 */

import type { Driver, CreateDriverRequest, UpdateDriverRequest } from "./drivers.types";
import { DriversRepository } from "./drivers.repository";
import { toDomain, toDomainMany, createRequestToApi, updateRequestToApi } from "./drivers.transformer";

/**
 * Driver colors for visual consistency across dispatch UI and map
 * Using orange variations as primary accent colors
 */
const DRIVER_COLORS = [
  "#F97316", // accent-500 - Primary orange
  "#FB923C", // accent-400 - Light orange
  "#EA580C", // accent-600 - Dark orange
];

const UNASSIGNED_COLOR = "#71717A"; // zinc-500 for unassigned orders

/**
 * Drivers Service - handles all business logic
 */
export class DriversService {
  private driversCache: Driver[] | null = null;

  constructor(private repository: DriversRepository) {}

  /**
   * Get all drivers, optionally filtered by active status
   */
  async getDrivers(options?: { isActive?: boolean }): Promise<Driver[]> {
    const response = await this.repository.findAll({
      is_active: options?.isActive,
    });
    const drivers = toDomainMany(response.drivers);
    
    // Cache drivers for ID lookups
    this.driversCache = drivers;
    
    return drivers;
  }

  /**
   * Get a single driver by ID (backend UUID)
   */
  async getDriver(driverId: string): Promise<Driver> {
    const apiDriver = await this.repository.findById(driverId);
    return toDomain(apiDriver);
  }

  /**
   * Create a new driver
   * TypeScript enforces required fields (name, phone) at compile time
   */
  async createDriver(driver: CreateDriverRequest): Promise<Driver> {
    const apiRequest = createRequestToApi(driver);
    const apiDriver = await this.repository.create(apiRequest);
    const domainDriver = toDomain(apiDriver);
    
    // Invalidate cache
    this.driversCache = null;
    
    return domainDriver;
  }

  /**
   * Update a driver
   */
  async updateDriver(
    driverId: string,
    updates: UpdateDriverRequest
  ): Promise<Driver> {
    const apiRequest = updateRequestToApi(updates);
    const apiDriver = await this.repository.update(driverId, apiRequest);
    const domainDriver = toDomain(apiDriver);
    
    // Invalidate cache
    this.driversCache = null;
    
    return domainDriver;
  }

  /**
   * Delete a driver
   */
  async deleteDriver(driverId: string): Promise<void> {
    await this.repository.delete(driverId);
    
    // Invalidate cache
    this.driversCache = null;
  }

  /**
   * Get driver by ID (from cache or fetch)
   * Useful for quick lookups without full fetch
   */
  async getDriverById(driverId: string): Promise<Driver | null> {
    // Try cache first
    if (this.driversCache) {
      const cached = this.driversCache.find((d) => d.id === driverId);
      if (cached) return cached;
    }

    // Fallback to API
    try {
      return await this.getDriver(driverId);
    } catch {
      return null;
    }
  }

  /**
   * Get color for a driver by their ID
   * Returns gray for unassigned orders
   * Uses driver's assigned color if available, otherwise uses color rotation
   */
  getDriverColor(driverId?: string | null, drivers?: Driver[]): string {
    if (!driverId) return UNASSIGNED_COLOR;

    // Use provided drivers or cache
    const driversToUse = drivers || this.driversCache || [];
    
    // Check if driver has assigned color
    const driver = driversToUse.find((d) => d.id === driverId);
    if (driver?.color) {
      return driver.color;
    }

    // Fallback to color rotation based on index
    const driverIndex = driversToUse.findIndex((d) => d.id === driverId);
    if (driverIndex === -1) return UNASSIGNED_COLOR;

    return DRIVER_COLORS[driverIndex % DRIVER_COLORS.length];
  }

  /**
   * Get all active drivers
   */
  async getActiveDrivers(): Promise<Driver[]> {
    return this.getDrivers({ isActive: true });
  }
}

/**
 * Create a singleton instance of DriversService
 * This will be replaced with dependency injection later
 */
let driversServiceInstance: DriversService | null = null;

export function getDriversService(): DriversService {
  if (!driversServiceInstance) {
    driversServiceInstance = new DriversService(new DriversRepository());
  }
  return driversServiceInstance;
}

