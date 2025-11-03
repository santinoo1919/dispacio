/**
 * Paste CSV Modal Screen
 * Native iOS modal for CSV input
 */

import { useRouter } from "expo-router";
import { View, Text, Pressable, TextInput, ScrollView } from "react-native";
import { useDispatchContext } from "@/context/dispatch-context";

export default function PasteCSVScreen() {
  const router = useRouter();
  const {
    csvText,
    setCsvText,
    isLoading,
    pasteFromClipboard,
    parseCSV,
    clear,
  } = useDispatchContext();

  const handleParseAndDismiss = () => {
    const result = parseCSV();
    if (result?.success) {
      router.back();
    }
  };

  const handleClear = () => {
    clear();
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="py-2">
            <Text className="text-blue-600 dark:text-blue-400 font-semibold text-base">
              Cancel
            </Text>
          </Pressable>
          <Text className="text-lg font-bold text-gray-900 dark:text-white">
            Add CSV Orders
          </Text>
          <View className="w-16" />
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView className="flex-1" contentContainerClassName="p-6">
        {/* Paste Button */}
        <Pressable
          onPress={pasteFromClipboard}
          className="bg-blue-500 px-4 py-3 rounded-lg mb-4 active:bg-blue-600"
        >
          <Text className="text-white font-medium text-center">
            📋 From Clipboard
          </Text>
        </Pressable>

        {/* Text Input - takes all space */}
        <TextInput
          value={csvText}
          onChangeText={setCsvText}
          placeholder="Paste your CSV data here...
Or tap 'From Clipboard' above"
          placeholderTextColor="#9CA3AF"
          multiline
          className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-base flex-1"
          style={{
            textAlignVertical: "top",
          }}
        />
      </ScrollView>

      {/* Sticky Bottom Buttons */}
      <View className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-4">
        <View className="flex-row gap-3">
          <Pressable
            onPress={handleParseAndDismiss}
            disabled={isLoading || !csvText.trim()}
            className={`flex-1 py-4 rounded-lg ${
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
            onPress={handleClear}
            className="bg-gray-500 px-6 py-4 rounded-lg active:bg-gray-600"
          >
            <Text className="text-white font-semibold">Clear</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
