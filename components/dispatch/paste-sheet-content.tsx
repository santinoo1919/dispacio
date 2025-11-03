/**
 * Paste Sheet Content Component
 * Content shown inside the bottom sheet for CSV input
 */

import { View, TextInput, Pressable, Text, ScrollView } from "react-native";

interface PasteSheetContentProps {
  csvText: string;
  setCsvText: (text: string) => void;
  isLoading: boolean;
  onPasteFromClipboard: () => void;
  onParse: () => void;
  onClear: () => void;
}

export function PasteSheetContent({
  csvText,
  setCsvText,
  isLoading,
  onPasteFromClipboard,
  onParse,
  onClear,
}: PasteSheetContentProps) {
  return (
    <View className="flex-1 pb-8">
      {/* Header */}
      <View className="mb-4">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          Add CSV Orders
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          Paste or write your order data
        </Text>
      </View>

      {/* Paste Button */}
      <Pressable
        onPress={onPasteFromClipboard}
        className="bg-blue-500 px-4 py-3 rounded-lg mb-4 active:bg-blue-600"
      >
        <Text className="text-white font-medium text-center">
          📋 From Clipboard
        </Text>
      </Pressable>

      {/* Text Input */}
      <TextInput
        value={csvText}
        onChangeText={setCsvText}
        placeholder="Paste your CSV data here...
Or tap 'From Clipboard' above"
        placeholderTextColor="#9CA3AF"
        multiline
        numberOfLines={12}
        className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-base flex-1"
        style={{
          textAlignVertical: "top",
          minHeight: 200,
        }}
      />

      {/* Action Buttons */}
      <View className="flex-row gap-3 mt-4">
        <Pressable
          onPress={onParse}
          disabled={isLoading || !csvText.trim()}
          className={`flex-1 py-3 rounded-lg ${
            isLoading || !csvText.trim()
              ? "bg-gray-400"
              : "bg-green-600 active:bg-green-700"
          }`}
        >
          <Text className="text-white text-center font-semibold text-base">
            {isLoading ? "⏳ Parsing..." : "✅ Parse CSV"}
          </Text>
        </Pressable>

        <Pressable
          onPress={onClear}
          className="bg-gray-500 px-6 py-3 rounded-lg active:bg-gray-600"
        >
          <Text className="text-white font-semibold">Clear</Text>
        </Pressable>
      </View>
    </View>
  );
}

