/**
 * React Query hooks for drivers
 * Thin layer that wraps DriversService with React Query
 */

import { getDriversService } from "@/lib/domains/drivers/drivers.service";
import type { Driver } from "@/lib/domains/drivers/drivers.types";
import { showToast } from "@/lib/utils/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Fetch all drivers (optionally filtered by active status)
 */
export function useDrivers(options?: { isActive?: boolean }) {
  const driversService = getDriversService();

  return useQuery({
    queryKey: ["drivers", options],
    queryFn: () => driversService.getDrivers(options),
  });
}

/**
 * Fetch a single driver by ID (backend UUID)
 */
export function useDriver(driverId: string | null | undefined) {
  const driversService = getDriversService();

  return useQuery({
    queryKey: ["drivers", driverId],
    queryFn: () => driversService.getDriver(driverId!),
    enabled: !!driverId,
  });
}

/**
 * Create a new driver
 */
export function useCreateDriver() {
  const queryClient = useQueryClient();
  const driversService = getDriversService();

  return useMutation({
    mutationFn: (driver: Partial<Driver>) => driversService.createDriver(driver),
    onSuccess: () => {
      // Invalidate drivers list to refetch
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      showToast.success("Driver Created", "Driver added successfully");
    },
    onError: (error) => {
      showToast.error(
        "Create Error",
        error instanceof Error ? error.message : "Failed to create driver"
      );
    },
  });
}

/**
 * Update a driver
 */
export function useUpdateDriver() {
  const queryClient = useQueryClient();
  const driversService = getDriversService();

  return useMutation({
    mutationFn: ({
      driverId,
      updates,
    }: {
      driverId: string;
      updates: Partial<Driver>;
    }) => driversService.updateDriver(driverId, updates),
    onSuccess: (data, variables) => {
      // Update cache optimistically
      queryClient.setQueryData(["drivers", variables.driverId], data);
      // Invalidate list to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      showToast.success("Driver Updated", "Driver information updated");
    },
    onError: (error) => {
      showToast.error(
        "Update Error",
        error instanceof Error ? error.message : "Failed to update driver"
      );
    },
  });
}

/**
 * Delete a driver
 */
export function useDeleteDriver() {
  const queryClient = useQueryClient();
  const driversService = getDriversService();

  return useMutation({
    mutationFn: (driverId: string) => driversService.deleteDriver(driverId),
    onSuccess: (data, driverId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ["drivers", driverId] });
      // Invalidate list to refetch
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      showToast.success("Driver Deleted", "Driver removed successfully");
    },
    onError: (error) => {
      showToast.error(
        "Delete Error",
        error instanceof Error ? error.message : "Failed to delete driver"
      );
    },
  });
}
