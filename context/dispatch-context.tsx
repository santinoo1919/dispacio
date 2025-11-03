/**
 * Dispatch Context
 * Global state management for orders and dispatches
 */

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Alert } from "react-native";
import * as Clipboard from "expo-clipboard";
import { CSVParser } from "@/lib/csv/parser";
import { Order, CSVParseResult } from "@/lib/types";
import { SAMPLE_FMCG_CSV } from "@/lib/data/sample-orders";

interface DispatchContextType {
  csvText: string;
  setCsvText: (text: string) => void;
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  isLoading: boolean;
  pasteFromClipboard: () => void;
  parseCSV: () => CSVParseResult | null;
  clear: () => void;
}

const DispatchContext = createContext<DispatchContextType | undefined>(
  undefined
);

export function DispatchProvider({ children }: { children: ReactNode }) {
  const [csvText, setCsvText] = useState(SAMPLE_FMCG_CSV);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const pasteFromClipboard = async () => {
    try {
      const clipboardText = await Clipboard.getStringAsync();
      if (clipboardText) {
        setCsvText(clipboardText);
      } else {
        Alert.alert(
          "Empty Clipboard",
          "Your clipboard is empty. Copy some CSV data first."
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to read clipboard");
    }
  };

  const parseCSV = (): CSVParseResult | null => {
    if (!csvText.trim()) {
      Alert.alert("No Data", "Please paste CSV data first");
      return null;
    }

    setIsLoading(true);
    const result = CSVParser.parse(csvText);

    if (result.success) {
      setOrders(result.orders);
      Alert.alert(
        "Success!",
        `Parsed ${
          result.orders.length
        } orders successfully.\n\nFound columns: ${result.headers.join(", ")}`
      );
    } else {
      Alert.alert("Parse Error", result.error || "Failed to parse CSV");
      setOrders([]);
    }
    setIsLoading(false);

    return result;
  };

  const clear = () => {
    setCsvText("");
    setOrders([]);
  };

  return (
    <DispatchContext.Provider
      value={{
        csvText,
        setCsvText,
        orders,
        setOrders,
        isLoading,
        pasteFromClipboard,
        parseCSV,
        clear,
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

