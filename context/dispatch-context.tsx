/**
 * Dispatch Context
 * Global state management for orders and dispatches
 */

import React, { createContext, useContext, useState, ReactNode } from "react";
import * as Clipboard from "expo-clipboard";
import { CSVParser } from "@/lib/csv/parser";
import { Order, CSVParseResult } from "@/lib/types";
import { SAMPLE_FMCG_CSV } from "@/lib/data/sample-orders";
import { showToast } from "@/lib/utils/toast";

interface DispatchContextType {
  csvText: string;
  setCsvText: (text: string) => void;
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  isLoading: boolean;
  isDispatchMode: boolean;
  selectedOrderIds: Set<string>;
  pasteFromClipboard: () => void;
  parseCSV: () => CSVParseResult | null;
  clear: () => void;
  toggleDispatchMode: () => void;
  toggleOrderSelection: (orderId: string) => void;
  assignSelectedOrders: (driverId: string) => void;
  clearSelection: () => void;
}

const DispatchContext = createContext<DispatchContextType | undefined>(
  undefined
);

export function DispatchProvider({ children }: { children: ReactNode }) {
  const [csvText, setCsvText] = useState(SAMPLE_FMCG_CSV);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDispatchMode, setIsDispatchMode] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(
    new Set()
  );

  const pasteFromClipboard = async () => {
    try {
      const clipboardText = await Clipboard.getStringAsync();
      if (clipboardText) {
        setCsvText(clipboardText);
        showToast.success("Clipboard loaded", "CSV data pasted successfully");
      } else {
        showToast.error(
          "Empty Clipboard",
          "Your clipboard is empty. Copy some CSV data first."
        );
      }
    } catch (error) {
      showToast.error("Error", "Failed to read clipboard");
    }
  };

  const parseCSV = (): CSVParseResult | null => {
    if (!csvText.trim()) {
      showToast.error("No Data", "Please paste CSV data first");
      return null;
    }

    setIsLoading(true);
    const result = CSVParser.parse(csvText);

    if (result.success) {
      setOrders(result.orders);
      showToast.success(
        "Success!",
        `Parsed ${result.orders.length} orders successfully. Found columns: ${result.headers.join(", ")}`
      );
    } else {
      showToast.error("Parse Error", result.error || "Failed to parse CSV");
      setOrders([]);
    }
    setIsLoading(false);

    return result;
  };

  const clear = () => {
    setCsvText("");
    setOrders([]);
    setSelectedOrderIds(new Set());
    setIsDispatchMode(false);
  };

  const toggleDispatchMode = () => {
    setIsDispatchMode((prev) => !prev);
    if (isDispatchMode) {
      setSelectedOrderIds(new Set());
    }
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const assignSelectedOrders = (driverId: string) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        selectedOrderIds.has(order.id) ? { ...order, driverId } : order
      )
    );
    setSelectedOrderIds(new Set());
    setIsDispatchMode(false);
  };

  const clearSelection = () => {
    setSelectedOrderIds(new Set());
  };

  return (
    <DispatchContext.Provider
      value={{
        csvText,
        setCsvText,
        orders,
        setOrders,
        isLoading,
        isDispatchMode,
        selectedOrderIds,
        pasteFromClipboard,
        parseCSV,
        clear,
        toggleDispatchMode,
        toggleOrderSelection,
        assignSelectedOrders,
        clearSelection,
      }}
    >
      {children}
    </DispatchContext.Provider>
  );
}

export function useDispatchContext() {
  const context = useContext(DispatchContext);
  if (!context) {
    throw new Error("useDispatchContext must be used within DispatchProvider");
  }
  return context;
}
