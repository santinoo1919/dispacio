/**
 * Empty State Component
 * Single Responsibility: Display empty state when no orders exist
 */

import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

export function EmptyState() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center px-6">
      <View className="items-center mb-8">
        <View className="bg-background-tertiary w-24 h-24 rounded-full items-center justify-center mb-4">
          <Text className="text-5xl">📋</Text>
        </View>
        <Text className="text-xl font-bold text-text mb-2">
          No Orders Yet
        </Text>
        <Text className="text-base text-text-secondary text-center">
          Add your CSV orders to start creating dispatches
        </Text>
      </View>
      <Pressable
        onPress={() => router.push("/paste-csv")}
        className="bg-accent-600 px-8 py-4 rounded-xl active:bg-accent-700"
      >
        <Text className="text-white font-semibold text-lg">
          + Add Orders
        </Text>
      </Pressable>
    </View>
  );
}

