/**
 * No Orders For Driver Component
 * Single Responsibility: Display message when selected driver has no orders
 */

import { Text, View } from "react-native";

export function NoOrdersForDriver() {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Text className="text-lg text-text-secondary text-center">
        No orders for this driver
      </Text>
    </View>
  );
}

