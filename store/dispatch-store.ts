/**
 * Dispatch Store
 * Zustand store with API integration
 * - Fetches orders from Fastify backend
 * - Sends CSV data to backend for processing
 * - Calls VROOM optimization API
 * - Keeps zones computed locally from fetched orders
 */

import { ZoneClusterer } from "@/lib/clustering/zone-clusterer";
import { CSVParser } from "@/lib/csv/parser";
import { DRIVERS } from "@/lib/data/drivers";
import {
  assignDriverToZone as apiAssignDriverToZone,
  optimizeRoute as apiOptimizeRoute,
  createOrders,
  createZones,
  fetchOrders,
  fetchZones,
} from "@/lib/services/api";
import { getStorage } from "@/lib/storage/storage";
import { CSVParseResult, OptimizedRoute, Order, Zone } from "@/lib/types";
import { findNearestDriver } from "@/lib/utils/distance";
import { showToast } from "@/lib/utils/toast";
import * as Clipboard from "expo-clipboard";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const zoneClusterer = new ZoneClusterer();

interface DispatchState {
  csvText: string;
  orders: Order[];
  zones: Zone[];
  isLoading: boolean;
  isOptimizing: boolean;

  // Actions
  setCsvText: (text: string) => void;
  setOrders: (orders: Order[]) => void;
  fetchOrdersFromAPI: (driverId?: string) => Promise<void>;
  pasteFromClipboard: () => void;
  parseAndUploadCSV: () => Promise<CSVParseResult | null>;
  clusterOrders: () => void;
  assignDriverToZone: (zoneId: string, driverId: string) => Promise<void>;
  optimizeRoute: (
    driverId: string,
    orderIds?: string[]
  ) => Promise<OptimizedRoute | null>;
  clear: () => void;
}

export const useDispatchStore = create<DispatchState>()(
  persist(
    (set, get) => ({
      // Initial state
      csvText: "",
      orders: [],
      zones: [],
      isLoading: false,
      isOptimizing: false,

      // Actions
      setCsvText: (text: string) => set({ csvText: text }),
      setOrders: (orders: Order[]) => {
        set({ orders });
        const newZones = zoneClusterer.clusterOrders(orders);
        console.log("[DEBUG setOrders] Total zones:", newZones.length);
        console.log("[DEBUG setOrders] Total drivers:", DRIVERS.length);
        // Auto-assign drivers to zones by geographic proximity and sync to backend
        const zonesWithDrivers = newZones.map((zone, index) => {
          // Always assign driver by geographic proximity (ignore existing assignments)
          const assignedDriverId = findNearestDriver(zone.center, DRIVERS);
          console.log(
            `[DEBUG setOrders] Zone ${index} -> Nearest driver (${assignedDriverId})`
          );

          // Sync driver assignment to backend (fire and forget)
          (async () => {
            try {
              const { bulkAssignDriver } = await import("@/lib/services/api");
              const { getBackendDriverId } = await import("@/lib/data/drivers");
              const backendDriverId = getBackendDriverId(assignedDriverId);
              if (!backendDriverId) {
                console.warn(
                  `[DEBUG setOrders] No backend driver ID for ${assignedDriverId}`
                );
                return;
              }

              const orderUuids = zone.orders
                .map((o) => (o as any).serverId)
                .filter(Boolean);

              if (orderUuids.length === 0) {
                console.warn(
                  `[DEBUG setOrders] Zone ${index} has no orders with server IDs`
                );
                return;
              }

              console.log(
                `[DEBUG setOrders] Zone ${index} syncing ${orderUuids.length} orders to backend via bulk endpoint`
              );

              const result = await bulkAssignDriver(
                orderUuids,
                backendDriverId
              );
              console.log(
                `[DEBUG setOrders] Zone ${index} bulk sync complete: ${result.updated} orders updated`
              );
            } catch (error: any) {
              const errorMsg = error?.message || String(error);
              const errorData = error?.data || {};
              const errorStatus = error?.status || "unknown";
              console.error(
                `[DEBUG setOrders] Zone ${index} backend sync failed:`,
                errorMsg
              );
              console.error("  HTTP status:", errorStatus);
              console.error(
                "  Error data:",
                JSON.stringify(errorData, null, 2)
              );
            }
          })();

          return { ...zone, assignedDriverId };
        });
        console.log(
          "[DEBUG setOrders] Final zones with drivers:",
          zonesWithDrivers.map((z) => ({
            id: z.id,
            driver: z.assignedDriverId,
          }))
        );
        set({ zones: zonesWithDrivers });
      },

      pasteFromClipboard: async () => {
        try {
          const clipboardText = await Clipboard.getStringAsync();
          if (clipboardText) {
            set({ csvText: clipboardText });
            showToast.success(
              "Clipboard loaded",
              "CSV data pasted successfully"
            );
          } else {
            showToast.error(
              "Empty Clipboard",
              "Your clipboard is empty. Copy some CSV data first."
            );
          }
        } catch {
          showToast.error("Error", "Failed to read clipboard");
        }
      },

      fetchOrdersFromAPI: async (driverId?: string) => {
        set({ isLoading: true });
        try {
          // Fetch orders and zones from backend (zones are stable)
          const [apiOrders, zonesResponse] = await Promise.all([
            fetchOrders(driverId),
            fetchZones(),
          ]);

          // Convert API format to local format
          const { getFrontendDriverId } = await import("@/lib/data/drivers");
          const orders: Order[] = apiOrders.map((o) => ({
            id: o.order_number || o.id,
            customerName: o.customer_name,
            address: o.address,
            phone: o.phone,
            notes: o.notes,
            amount: o.amount,
            items: o.items,
            priority: (o.priority as "low" | "normal" | "high") || "normal",
            rank: o.route_rank || 0,
            driverId: getFrontendDriverId(o.driver_id) || undefined, // Convert backend UUID to frontend ID
            latitude: o.latitude,
            longitude: o.longitude,
            packageLength: o.package_length,
            packageWidth: o.package_width,
            packageHeight: o.package_height,
            packageWeight: o.package_weight,
            packageVolume: o.package_volume,
            serverId: o.id,
            rawData: o.raw_data || {},
          }));

          // If no zones exist but orders do, create zones automatically
          const { getBackendDriverId } = await import("@/lib/data/drivers");
          let zones: Zone[] = [];
          if (zonesResponse.zones.length === 0 && orders.length > 0) {
            // Auto-create zones for existing orders
            const clusteredZones = zoneClusterer.clusterOrders(orders);
            const zonesToCreate = clusteredZones.map((zone) => ({
              name: zone.id,
              center: zone.center,
              orderIds: zone.orders
                .map((o) => o.serverId)
                .filter(Boolean) as string[],
            }));

            if (zonesToCreate.length > 0) {
              const createResult = await createZones(zonesToCreate);
              // Convert created zones to frontend format
              zones = createResult.zones.map((z) => {
                const zoneOrders = orders.filter((o) =>
                  z.orders.some((zo) => zo.id === o.serverId)
                );
                const driverIds = new Set(
                  zoneOrders.map((o) => o.driverId).filter(Boolean)
                );
                let assignedDriverId: string | undefined;
                if (driverIds.size === 1) {
                  assignedDriverId = Array.from(driverIds)[0];
                } else {
                  const nearestDriverId = findNearestDriver(z.center, DRIVERS);
                  const backendDriverId = getBackendDriverId(nearestDriverId);
                  if (backendDriverId) {
                    assignedDriverId = nearestDriverId;
                    // Use z.id (UUID from backend) for API calls
                    apiAssignDriverToZone(z.id, backendDriverId).catch(
                      () => {}
                    );
                  }
                }
                return {
                  id: z.name || z.id, // Use name (e.g., "Zone 1") as id for display
                  serverId: z.id, // Store UUID for API calls
                  center: z.center,
                  orders: zoneOrders,
                  orderCount: zoneOrders.length,
                  assignedDriverId,
                };
              });
            }
          } else {
            // Convert backend zones to frontend format
            zones = zonesResponse.zones.map((z) => {
              // Get orders for this zone from our orders array
              const zoneOrders = orders.filter((o) =>
                z.orders.some((zo) => zo.id === o.serverId)
              );

              // Determine assigned driver (from orders or geographic matching)
              const driverIds = new Set(
                zoneOrders.map((o) => o.driverId).filter(Boolean)
              );
              let assignedDriverId: string | undefined;
              if (driverIds.size === 1) {
                // All orders have same driver
                assignedDriverId = Array.from(driverIds)[0];
              } else {
                // Use geographic matching
                const nearestDriverId = findNearestDriver(z.center, DRIVERS);
                const backendDriverId = getBackendDriverId(nearestDriverId);
                if (backendDriverId) {
                  assignedDriverId = nearestDriverId;
                  // Sync to backend (fire and forget) - use z.id (UUID from backend) for API calls
                  apiAssignDriverToZone(z.id, backendDriverId).catch(() => {});
                }
              }

              return {
                id: z.name || z.id, // Use name (e.g., "Zone 1") as id for display
                serverId: z.id, // Store UUID for API calls
                center: z.center,
                orders: zoneOrders,
                orderCount: zoneOrders.length,
                assignedDriverId,
              };
            });
          }

          set({ orders, zones });
        } catch (error) {
          showToast.error(
            "Fetch Error",
            error instanceof Error ? error.message : "Failed to fetch orders"
          );
        } finally {
          set({ isLoading: false });
        }
      },

      parseAndUploadCSV: async (): Promise<CSVParseResult | null> => {
        const { csvText } = get();
        if (!csvText.trim()) {
          showToast.error("No Data", "Please paste CSV data first");
          return null;
        }

        set({ isLoading: true });

        try {
          // Parse CSV locally first
          const result = CSVParser.parse(csvText);

          if (!result.success) {
            showToast.error(
              "Parse Error",
              result.error || "Failed to parse CSV"
            );
            set({ isLoading: false });
            return result;
          }

          // Convert to API format
          const { getBackendDriverId } = await import("@/lib/data/drivers");
          const apiOrders = result.orders.map((order) => ({
            order_number: order.id,
            customer_name: order.customerName,
            address: order.address,
            phone: order.phone,
            notes: order.notes,
            amount: order.amount,
            items: order.items,
            priority: order.priority,
            package_length: order.packageLength,
            package_width: order.packageWidth,
            package_height: order.packageHeight,
            package_weight: order.packageWeight,
            package_volume: order.packageVolume,
            latitude: order.latitude,
            longitude: order.longitude,
            driver_id: order.driverId
              ? getBackendDriverId(order.driverId) || undefined
              : undefined, // Convert frontend ID to backend UUID
            route_rank: order.rank,
            rawData: order.rawData,
          }));

          // Upload to backend
          const uploadResult = await createOrders(apiOrders);

          if (uploadResult.success) {
            // Cluster orders and create zones in backend
            const ordersWithServerIds = uploadResult.orders;
            const { getFrontendDriverId } = await import("@/lib/data/drivers");
            const localOrders: Order[] = ordersWithServerIds.map((o) => ({
              id: o.order_number || o.id,
              customerName: o.customer_name,
              address: o.address,
              phone: o.phone,
              notes: o.notes,
              amount: o.amount,
              items: o.items,
              priority: (o.priority as "low" | "normal" | "high") || "normal",
              rank: o.route_rank || 0,
              driverId: getFrontendDriverId(o.driver_id) || undefined, // Convert backend UUID to frontend ID
              latitude: o.latitude,
              longitude: o.longitude,
              packageLength: o.package_length,
              packageWidth: o.package_width,
              packageHeight: o.package_height,
              packageWeight: o.package_weight,
              packageVolume: o.package_volume,
              serverId: o.id,
              rawData: o.raw_data || {},
            }));

            // Cluster orders locally
            const clusteredZones = zoneClusterer.clusterOrders(localOrders);

            // Create zones in backend with order assignments
            const zonesToCreate = clusteredZones.map((zone, index) => ({
              name: zone.id,
              center: zone.center,
              orderIds: zone.orders
                .map((o) => o.serverId)
                .filter(Boolean) as string[],
            }));

            if (zonesToCreate.length > 0) {
              await createZones(zonesToCreate);
            }

            showToast.success(
              "Success!",
              `Uploaded ${uploadResult.created} orders and created ${
                zonesToCreate.length
              } zones. Found columns: ${result.headers.join(", ")}`
            );

            // Fetch updated orders and zones from API
            await get().fetchOrdersFromAPI();

            return result;
          } else {
            showToast.error(
              "Upload Error",
              `Failed to upload ${uploadResult.failed} orders`
            );
            return null;
          }
        } catch (error) {
          showToast.error(
            "Error",
            error instanceof Error ? error.message : "Failed to upload CSV"
          );
          return null;
        } finally {
          set({ isLoading: false });
        }
      },

      clusterOrders: () => {
        const { orders } = get();
        const newZones = zoneClusterer.clusterOrders(orders);
        // Preserve zone driver assignments if all orders in zone have same driver
        const zonesWithDrivers = newZones.map((zone) => {
          const driverIds = new Set(
            zone.orders.map((o) => o.driverId).filter(Boolean)
          );
          if (driverIds.size === 1) {
            return { ...zone, assignedDriverId: Array.from(driverIds)[0] };
          }
          return zone;
        });
        set({ zones: zonesWithDrivers });
      },

      assignDriverToZone: async (zoneId: string, driverId: string) => {
        const { zones } = get();
        const zone = zones.find((z) => z.id === zoneId);
        if (!zone) return;

        // Update local state
        const updatedZones = zones.map((z) =>
          z.id === zoneId ? { ...z, assignedDriverId: driverId } : z
        );
        const updatedOrders = get().orders.map((order) =>
          zone.orders.some((zo) => zo.id === order.id)
            ? { ...order, driverId }
            : order
        );

        set({ orders: updatedOrders, zones: updatedZones });

        // Sync to backend using zone endpoint
        try {
          const { getBackendDriverId } = await import("@/lib/data/drivers");
          const backendDriverId = getBackendDriverId(driverId);
          if (!backendDriverId) return;

          // Use serverId (UUID) for API calls, fallback to zoneId if no serverId
          const zoneServerId = zone.serverId || zoneId;
          await apiAssignDriverToZone(zoneServerId, backendDriverId);
        } catch (error) {
          console.error("Failed to sync driver assignment:", error);
        }
      },

      optimizeRoute: async (
        driverId: string,
        orderIds?: string[]
      ): Promise<OptimizedRoute | null> => {
        set({ isOptimizing: true });
        try {
          // Convert frontend driver ID to backend UUID
          const { getBackendDriverId } = await import("@/lib/data/drivers");
          const backendDriverId = getBackendDriverId(driverId) || driverId;

          const result = await apiOptimizeRoute(backendDriverId, orderIds);

          if (result.success) {
            showToast.success(
              "Route Optimized",
              `Total distance: ${result.totalDistance.toFixed(1)} km`
            );

            // Refresh orders from API to get updated ranks
            // Don't filter by driverId - refresh all to preserve zone structure
            await get().fetchOrdersFromAPI();

            return result;
          } else {
            showToast.error("Optimization Failed", "Could not optimize route");
            return null;
          }
        } catch (error) {
          showToast.error(
            "Optimization Error",
            error instanceof Error ? error.message : "Failed to optimize route"
          );
          return null;
        } finally {
          set({ isOptimizing: false });
        }
      },

      clear: () => {
        set({
          csvText: "",
          orders: [],
          zones: [],
        });
      },
    }),
    {
      name: "dispatch-storage",
      storage: createJSONStorage(() => getStorage()),
      // Only persist minimal state (orders will be fetched from API)
      partialize: (state) => ({
        csvText: state.csvText,
        // Don't persist orders - fetch from API on startup
        zones: state.zones,
      }),
    }
  )
);
