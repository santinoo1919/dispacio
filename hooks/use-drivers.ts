/**
 * React Query hooks for drivers
 * Handles fetching, creating, updating, and deleting drivers
 */

import {
  createDriver,
  deleteDriver,
  fetchDriver,
  fetchDrivers,
  updateDriver,
  type CreateDriverRequest,
  type UpdateDriverRequest,
} from "@/lib/services/api";
import { showToast } from "@/lib/utils/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Fetch all drivers (optionally filtered by active status)
 */
export function useDrivers(options?: { is_active?: boolean }) {
  return useQuery({
    queryKey: ["drivers", options],
    queryFn: () => fetchDrivers(options),
    select: (data) => data.drivers, // Return just the drivers array
  });
}

/**
 * Fetch a single driver by ID
 */
export function useDriver(driverId: string | null | undefined) {
  return useQuery({
    queryKey: ["drivers", driverId],
    queryFn: () => fetchDriver(driverId!),
    enabled: !!driverId, // Only fetch if driverId is provided
  });
}

/**
 * Create a new driver
 */
export function useCreateDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (driver: CreateDriverRequest) => createDriver(driver),
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

  return useMutation({
    mutationFn: ({
      driverId,
      updates,
    }: {
      driverId: string;
      updates: UpdateDriverRequest;
    }) => updateDriver(driverId, updates),
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

  return useMutation({
    mutationFn: (driverId: string) => deleteDriver(driverId),
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

