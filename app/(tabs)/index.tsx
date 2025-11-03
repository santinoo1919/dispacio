import { ScrollView, TextInput, View, Pressable, Text } from "react-native";
import { useCSVParser } from "@/hooks/use-csv-parser";
import { OrderList } from "@/components/dispatch/order-list";

export default function DispatchScreen() {
  const {
    csvText,
    setCsvText,
    orders,
    isLoading,
    pasteFromClipboard,
    parseCSV,
    clear,
  } = useCSVParser();

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900">
      <View className="px-4 py-6">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Dispatch
          </Text>
          <Text className="text-base text-gray-600 dark:text-gray-400">
            Paste CSV and create dispatches for drivers
          </Text>
        </View>

        {/* Paste Section */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              Paste CSV Data
            </Text>
            <Pressable
              onPress={pasteFromClipboard}
              className="bg-blue-500 px-4 py-2 rounded-lg active:bg-blue-600"
            >
              <Text className="text-white font-medium">📋 From Clipboard</Text>
            </Pressable>
          </View>

          <TextInput
            value={csvText}
            onChangeText={setCsvText}
            placeholder="Paste your CSV data here...
Or tap 'From Clipboard' button above"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={8}
            className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-base"
            style={{
              textAlignVertical: "top",
              minHeight: 150,
            }}
          />

          {/* Action Buttons */}
          <View className="flex-row gap-3 mt-3">
            <Pressable
              onPress={parseCSV}
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
              onPress={clear}
              className="bg-gray-500 px-6 py-3 rounded-lg active:bg-gray-600"
            >
              <Text className="text-white font-semibold">Clear</Text>
            </Pressable>
          </View>
        </View>

        {/* Orders List */}
        <OrderList orders={orders} />

        {/* Instructions */}
        {orders.length === 0 && !csvText && (
          <View className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <Text className="text-base font-semibold text-blue-900 dark:text-blue-200 mb-2">
              📋 How to use
            </Text>
            <Text className="text-sm text-blue-800 dark:text-blue-300 mb-2">
              1. Copy your CSV data from Excel/Google Sheets
            </Text>
            <Text className="text-sm text-blue-800 dark:text-blue-300 mb-2">
              2. Tap "From Clipboard" or paste manually
            </Text>
            <Text className="text-sm text-blue-800 dark:text-blue-300">
              3. Tap "Parse CSV" to convert to orders
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
