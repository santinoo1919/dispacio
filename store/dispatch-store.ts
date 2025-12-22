/**
 * Dispatch Store
 * Zustand store for client-only UI state
 * - CSV text input (work-in-progress)
 * - Clipboard operations
 *
 * NOTE: All server state (orders, zones) is now managed by React Query
 * See hooks/use-orders.ts, hooks/use-zones.ts, etc.
 */

import { getStorage } from "@/lib/storage/storage";
import { showToast } from "@/lib/utils/toast";
import * as Clipboard from "expo-clipboard";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface DispatchState {
  csvText: string;

  // Actions
  setCsvText: (text: string) => void;
  pasteFromClipboard: () => Promise<void>;
  clear: () => void;
}

export const useDispatchStore = create<DispatchState>()(
  persist(
    (set) => ({
      // Initial state
      csvText: "",

      // Actions
      setCsvText: (text: string) => set({ csvText: text }),

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

      clear: () => {
        set({ csvText: "" });
      },
    }),
    {
      name: "dispatch-storage",
      storage: createJSONStorage(() => getStorage()),
      // Only persist client-only state
      partialize: (state) => ({
        csvText: state.csvText,
      }),
    }
  )
);
