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
import {
  optimizeRoute as apiOptimizeRoute,
  createOrders,
  fetchOrders,
} from "@/lib/services/api";
import { getStorage } from "@/lib/storage/storage";
import { CSVParseResult, OptimizedRoute, Order, Zone } from "@/lib/types";
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
          const apiOrders = await fetchOrders(driverId);

          // Convert API format to local format
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
            driverId: o.driver_id,
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

          set({ orders });

          // Recompute zones from fetched orders
          const newZones = zoneClusterer.clusterOrders(orders);
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
            driver_id: order.driverId,
            route_rank: order.rank,
            rawData: order.rawData,
          }));

          // Upload to backend
          const uploadResult = await createOrders(apiOrders);

          if (uploadResult.success) {
            showToast.success(
              "Success!",
              `Uploaded ${
                uploadResult.created
              } orders to backend. Found columns: ${result.headers.join(", ")}`
            );

            // Fetch updated orders from API
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
        const { orders, zones } = get();

        // Find the zone
        const zone = zones.find((z) => z.id === zoneId);
        if (!zone) return;

        // Get all order IDs in this zone
        const zoneOrderIds = new Set(zone.orders.map((o) => o.id));

        // Update orders locally first (optimistic update)
        const updatedOrders = orders.map((order) =>
          zoneOrderIds.has(order.id) ? { ...order, driverId } : order
        );

        const updatedZones = zones.map((z) =>
          z.id === zoneId ? { ...z, assignedDriverId: driverId } : z
        );

        set({ orders: updatedOrders, zones: updatedZones });

        // Update on backend (fire and forget for now)
        try {
          const { updateOrder } = await import("@/lib/services/api");
          for (const orderId of zoneOrderIds) {
            const order = orders.find((o) => o.id === orderId);
            if (order?.serverId) {
              await updateOrder(order.serverId, { driver_id: driverId });
            }
          }
        } catch (error) {
          // Silently fail - optimistic update already applied
          console.error("Failed to sync driver assignment:", error);
        }
      },

      optimizeRoute: async (
        driverId: string,
        orderIds?: string[]
      ): Promise<OptimizedRoute | null> => {
        set({ isOptimizing: true });
        try {
          const result = await apiOptimizeRoute(driverId, orderIds);

          if (result.success) {
            showToast.success(
              "Route Optimized",
              `Total distance: ${result.totalDistance.toFixed(1)} km`
            );

            // Refresh orders from API to get updated ranks
            await get().fetchOrdersFromAPI(driverId);

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
