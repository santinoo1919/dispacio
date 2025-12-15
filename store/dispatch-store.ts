/**
 * Dispatch Store
 * Zustand store with smart storage persistence (MMKV with AsyncStorage fallback)
 * - Uses MMKV in dev client/production for best performance
 * - Falls back to AsyncStorage in Expo Go for compatibility
 *
 * Only stores long-living, shared state across screens:
 * - csvText: Raw CSV input (persisted)
 * - orders: Parsed orders (persisted)
 * - zones: Clustered zones (persisted)
 * - isLoading: Transient loading state (not persisted)
 */

import { ZoneClusterer } from "@/lib/clustering/zone-clusterer";
import { CSVParser } from "@/lib/csv/parser";
import { SAMPLE_FMCG_CSV } from "@/lib/data/sample-orders";
import { getStorage } from "@/lib/storage/storage";
import { CSVParseResult, Order, Zone } from "@/lib/types";
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

  // Actions
  setCsvText: (text: string) => void;
  setOrders: (orders: Order[]) => void;
  pasteFromClipboard: () => void;
  parseCSV: () => CSVParseResult | null;
  clusterOrders: () => void;
  assignDriverToZone: (zoneId: string, driverId: string) => void;
  clear: () => void;
}

export const useDispatchStore = create<DispatchState>()(
  persist(
    (set, get) => ({
      // Initial state
      csvText: SAMPLE_FMCG_CSV,
      orders: [],
      zones: [],
      isLoading: false,

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

      parseCSV: (): CSVParseResult | null => {
        const { csvText } = get();
        if (!csvText.trim()) {
          showToast.error("No Data", "Please paste CSV data first");
          return null;
        }

        set({ isLoading: true });
        const result = CSVParser.parse(csvText);

        if (result.success) {
          set({ orders: result.orders });
          const newZones = zoneClusterer.clusterOrders(result.orders);
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
          showToast.success(
            "Success!",
            `Parsed ${
              result.orders.length
            } orders successfully. Found columns: ${result.headers.join(", ")}`
          );
        } else {
          showToast.error("Parse Error", result.error || "Failed to parse CSV");
          set({ orders: [] });
        }
        set({ isLoading: false });

        return result;
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

      assignDriverToZone: (zoneId: string, driverId: string) => {
        const { orders, zones } = get();

        // Find the zone
        const zone = zones.find((z) => z.id === zoneId);
        if (!zone) return;

        // Get all order IDs in this zone
        const zoneOrderIds = new Set(zone.orders.map((o) => o.id));

        // Update all orders in the zone with the driver ID
        const updatedOrders = orders.map((order) =>
          zoneOrderIds.has(order.id) ? { ...order, driverId } : order
        );

        // Update the zone with assigned driver
        const updatedZones = zones.map((z) =>
          z.id === zoneId ? { ...z, assignedDriverId: driverId } : z
        );

        set({ orders: updatedOrders, zones: updatedZones });
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
      // Only persist long-living, shared state
      partialize: (state) => ({
        csvText: state.csvText,
        orders: state.orders,
        zones: state.zones,
      }),
    }
  )
);
