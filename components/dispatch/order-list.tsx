/**
 * Order List Component
 * Displays parsed orders in a scrollable list
 */

import { View, ScrollView, Text } from "react-native";
import { Order } from "@/lib/types";

interface OrderListProps {
  orders: Order[];
}

export function OrderList({ orders }: OrderListProps) {
  if (orders.length === 0) return null;

  return (
    <View className="mb-6">
      <Text className="text-lg font-semibold text-text mb-3">
        Parsed Orders ({orders.length})
      </Text>

      <ScrollView className="border border-border rounded-lg p-4 bg-background-secondary max-h-96">
        {orders.map((order, index) => (
          <View
            key={order.id || index}
            className="border-b border-border py-3 last:border-b-0"
          >
            <View className="flex-row items-start mb-2">
              <View className="bg-background-tertiary w-8 h-8 rounded-full items-center justify-center mr-3">
                <Text className="text-text font-semibold text-sm">
                  {index + 1}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-text">
                  {order.customerName}
                </Text>
                <Text className="text-sm text-text-secondary mt-1">
                  {order.address}
                </Text>
                {order.amount && (
                  <Text className="text-sm font-semibold text-green-500 mt-1">
                    💰 DH {order.amount.toFixed(2)}
                  </Text>
                )}
                {order.items && (
                  <Text className="text-sm text-text-secondary mt-1">
                    📦 {order.items}
                  </Text>
                )}
                {order.phone && (
                  <Text className="text-sm text-text-secondary mt-1">
                    📞 {order.phone}
                  </Text>
                )}
                {order.notes && (
                  <Text className="text-sm text-text-secondary mt-1">
                    📝 {order.notes}
                  </Text>
                )}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

