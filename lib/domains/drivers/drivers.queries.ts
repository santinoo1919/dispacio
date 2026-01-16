/**
 * React Query hooks for drivers
 * Thin layer that wraps DriversService with React Query
 */

import { getDriversService } from "@/lib/domains/drivers/drivers.service";
import type {
  CreateDriverRequest,
  Driver,
  UpdateDriverRequest,
} from "@/lib/domains/drivers/drivers.types";
import { queryKeys } from "@/lib/react-query/query-keys";
import { showToast } from "@/lib/utils/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Strongly typed options for useDrivers hook
 * Prevents using snake_case API format (is_active) instead of camelCase (isActive)
 */
export interface UseDriversOptions {
  isActive?: boolean;
  // Explicitly exclude is_active to prevent accidental usage
  is_active?: never;
}

/**
 * Fetch all drivers (optionally filtered by active status)
 * Uses strongly typed options to prevent API format mistakes
 */
export function useDrivers(options?: UseDriversOptions) {
  const driversService = getDriversService();

  return useQuery({
    queryKey: queryKeys.drivers.list(options),
    queryFn: () => driversService.getDrivers(options),
  });
}

/**
 * Fetch a single driver by ID (backend UUID)
 */
export function useDriver(driverId: string | null | undefined) {
  const driversService = getDriversService();

  return useQuery({
    queryKey: queryKeys.drivers.detail(driverId!),
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
    mutationFn: (driver: CreateDriverRequest) =>
      driversService.createDriver(driver),
    onSuccess: () => {
      // Invalidate drivers list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all });
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
 * Uses optimistic updates and setQueryData for instant UI feedback
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
      updates: UpdateDriverRequest;
    }) => driversService.updateDriver(driverId, updates),
    onMutate: async ({ driverId, updates }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: queryKeys.drivers.all });

      // Snapshot previous values for rollback
      const previousDriver = queryClient.getQueryData<Driver>(
        queryKeys.drivers.detail(driverId)
      );
      const previousDrivers = queryClient.getQueryData<Driver[]>(
        queryKeys.drivers.list()
      );

      // Optimistically update detail
      if (previousDriver) {
        queryClient.setQueryData<Driver>(queryKeys.drivers.detail(driverId), {
          ...previousDriver,
          ...updates,
        });
      }

      // Optimistically update in list
      queryClient.setQueryData<Driver[]>(queryKeys.drivers.list(), (old) =>
        old?.map((d) => (d.id === driverId ? { ...d, ...updates } : d))
      );

      return { previousDriver, previousDrivers };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousDriver) {
        queryClient.setQueryData(
          queryKeys.drivers.detail(variables.driverId),
          context.previousDriver
        );
      }
      if (context?.previousDrivers) {
        queryClient.setQueryData(
          queryKeys.drivers.list(),
          context.previousDrivers
        );
      }
      showToast.error(
        "Update Error",
        error instanceof Error ? error.message : "Failed to update driver"
      );
    },
    onSuccess: (data, variables) => {
      // Update with real data from server (in case server computed something)
      queryClient.setQueryData(
        queryKeys.drivers.detail(variables.driverId),
        data
      );

      // Update in list with real data
      queryClient.setQueryData<Driver[]>(queryKeys.drivers.list(), (old) =>
        old?.map((d) => (d.id === variables.driverId ? data : d))
      );

      // NO invalidateQueries needed - we already have the data!
      showToast.success("Driver Updated", "Driver information updated");
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
      queryClient.removeQueries({
        queryKey: queryKeys.drivers.detail(driverId),
      });
      // Invalidate list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all });
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
