/**
 * Order List Component
 * Displays parsed orders in a scrollable list
 */

import { View, ScrollView, Text } from "react-native";
import { Order } from "@/lib/types";
import { OrderCard } from "./order-card";

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

      <ScrollView className="bg-background-secondary max-h-96">
        {orders.map((order, index) => {
          const isLast = index === orders.length - 1;
          return (
            <View key={order.id || index}>
              <OrderCard order={order} index={index} variant="compact" />
              {!isLast && (
                <View className="h-px bg-border w-full" />
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

