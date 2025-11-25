/**
 * Custom hook for CSV parsing functionality
 * Single Responsibility: Handles all CSV parsing logic
 */

import { useState } from "react";
import * as Clipboard from "expo-clipboard";
import { CSVParser } from "@/lib/csv/parser";
import { Order, CSVParseResult } from "@/lib/types";
import { SAMPLE_FMCG_CSV } from "@/lib/data/sample-orders";
import { showToast } from "@/lib/utils/toast";

export function useCSVParser() {
  const [csvText, setCsvText] = useState(SAMPLE_FMCG_CSV);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
  };

  return {
    csvText,
    setCsvText,
    orders,
    isLoading,
    pasteFromClipboard,
    parseCSV,
    clear,
  };
}

