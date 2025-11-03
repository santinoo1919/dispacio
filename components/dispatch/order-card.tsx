/**
 * Order Card Component
 * Individual draggable order card
 */

import { View, Text, TouchableOpacity } from "react-native";
import { Order } from "@/lib/types";

interface OrderCardProps {
  order: Order;
  index: number;
}

export function OrderCard({ order, index }: OrderCardProps) {
  return (
    <View className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-3 shadow-sm">
      {/* Header with Order Number */}
      <View className="flex-row items-start mb-2">
        <View className="bg-blue-500 w-8 h-8 rounded-full items-center justify-center mr-3">
          <Text className="text-white font-semibold text-sm">{index + 1}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900 dark:text-white">
            {order.customerName}
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {order.address}
          </Text>
        </View>
        <View className="ml-2">
          <Text className="text-2xl text-gray-400">⋮⋮</Text>
        </View>
      </View>

      {/* Order Details */}
      {order.amount && (
        <Text className="text-sm font-semibold text-green-600 dark:text-green-400 mt-2">
          💰 DH {order.amount.toFixed(2)}
        </Text>
      )}
      {order.items && (
        <Text className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          📦 {order.items}
        </Text>
      )}
      {order.phone && (
        <Text className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          📞 {order.phone}
        </Text>
      )}
      {order.notes && (
        <Text className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          📝 {order.notes}
        </Text>
      )}
    </View>
  );
}

