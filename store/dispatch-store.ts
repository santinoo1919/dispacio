/**
 * Dispatch Store
 * Zustand store with smart storage persistence (MMKV with AsyncStorage fallback)
 * - Uses MMKV in dev client/production for best performance
 * - Falls back to AsyncStorage in Expo Go for compatibility
 */

import { CSVParser } from "@/lib/csv/parser";
import { SAMPLE_FMCG_CSV } from "@/lib/data/sample-orders";
import { getStorage } from "@/lib/storage/storage";
import { CSVParseResult, Order } from "@/lib/types";
import { showToast } from "@/lib/utils/toast";
import * as Clipboard from "expo-clipboard";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface DispatchState {
  csvText: string;
  orders: Order[];
  isLoading: boolean;
  isDispatchMode: boolean;
  selectedOrderIds: Set<string>;

  // Actions
  setCsvText: (text: string) => void;
  setOrders: (orders: Order[]) => void;
  pasteFromClipboard: () => void;
  parseCSV: () => CSVParseResult | null;
  clear: () => void;
  toggleDispatchMode: () => void;
  toggleOrderSelection: (orderId: string) => void;
  assignSelectedOrders: (driverId: string) => void;
  clearSelection: () => void;
}

// Helper to convert Set to array for persistence
const setToArray = (set: Set<string>): string[] => Array.from(set);
const arrayToSet = (arr: string[]): Set<string> => new Set(arr);

export const useDispatchStore = create<DispatchState>()(
  persist(
    (set, get) => ({
      // Initial state
      csvText: SAMPLE_FMCG_CSV,
      orders: [],
      isLoading: false,
      isDispatchMode: false,
      selectedOrderIds: new Set<string>(),

      // Actions
      setCsvText: (text: string) => set({ csvText: text }),
      setOrders: (orders: Order[]) => set({ orders }),

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

      clear: () => {
        set({
          csvText: "",
          orders: [],
          selectedOrderIds: new Set(),
          isDispatchMode: false,
        });
      },

      toggleDispatchMode: () => {
        const { isDispatchMode } = get();
        set({ isDispatchMode: !isDispatchMode });
        if (isDispatchMode) {
          set({ selectedOrderIds: new Set() });
        }
      },

      toggleOrderSelection: (orderId: string) => {
        const { selectedOrderIds } = get();
        const next = new Set(selectedOrderIds);
        if (next.has(orderId)) {
          next.delete(orderId);
        } else {
          next.add(orderId);
        }
        set({ selectedOrderIds: next });
      },

      assignSelectedOrders: (driverId: string) => {
        const { orders, selectedOrderIds } = get();
        const updatedOrders = orders.map((order) =>
          selectedOrderIds.has(order.id) ? { ...order, driverId } : order
        );
        set({
          orders: updatedOrders,
          selectedOrderIds: new Set(),
          isDispatchMode: false,
        });
      },

      clearSelection: () => {
        set({ selectedOrderIds: new Set() });
      },
    }),
    {
      name: "dispatch-storage",
      storage: createJSONStorage(() => getStorage()),
      // Only persist these fields (exclude isLoading as it's transient)
      partialize: (state) => ({
        csvText: state.csvText,
        orders: state.orders,
        isDispatchMode: state.isDispatchMode,
        // Convert Set to array for persistence
        selectedOrderIdsArray: setToArray(state.selectedOrderIds),
      }),
      // Restore Set from array on hydration
      merge: (persistedState, currentState) => {
        const persisted = persistedState as any;
        return {
          ...currentState,
          ...persisted,
          // Convert array back to Set
          selectedOrderIds: persisted.selectedOrderIdsArray
            ? arrayToSet(persisted.selectedOrderIdsArray)
            : currentState.selectedOrderIds,
        };
      },
    }
  )
);
