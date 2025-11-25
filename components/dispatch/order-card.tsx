/**
 * Order Card Component
 * Individual draggable order card
 */

import { View, Text, Pressable } from "react-native";
import { Order } from "@/lib/types";

interface OrderCardProps {
  order: Order;
  index: number;
  isDispatchMode?: boolean;
  isSelected?: boolean;
  driverInitials?: string;
  driverColor?: string; // Color for driver initials circle
  onToggleSelect?: () => void;
}

export function OrderCard({
  order,
  index,
  isDispatchMode = false,
  isSelected = false,
  driverInitials,
  driverColor,
  onToggleSelect,
}: OrderCardProps) {
  const CardWrapper = isDispatchMode ? Pressable : View;
  const cardProps = isDispatchMode ? { onPress: onToggleSelect } : {};

  return (
    <CardWrapper
      {...cardProps}
      className={`bg-background-secondary border rounded-xl p-4 shadow-sm ${
        isSelected
          ? "border-accent-600 bg-accent-600/10"
          : "border-border"
      }`}
    >
      {/* Header with Order Number */}
      <View className="flex-row items-start mb-2">
        <View className="bg-background-tertiary w-8 h-8 rounded-full items-center justify-center mr-3">
          <Text className="text-text font-semibold text-sm">{index + 1}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-text">
            {order.customerName}
          </Text>
          <Text className="text-sm text-text-secondary mt-1">
            {order.address}
          </Text>
        </View>
        <View className="ml-2">
          {isDispatchMode ? (
            <View
              className={`w-6 h-6 rounded border-2 items-center justify-center ${
                isSelected
                  ? "bg-accent-600 border-accent-600"
                  : "border-border bg-background"
              }`}
            >
              {isSelected && (
                <Text className="text-white text-xs font-bold">✓</Text>
              )}
            </View>
          ) : driverInitials ? (
            <View
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: driverColor || "#9CA3AF" }}
            >
              <Text className="text-white font-semibold text-xs">
                {driverInitials}
              </Text>
            </View>
          ) : (
            <Text className="text-2xl text-text-tertiary">⋮⋮</Text>
          )}
        </View>
      </View>

      {/* Order Details */}
      {order.amount && (
        <Text className="text-sm font-semibold text-green-500 mt-2">
          💰 DH {order.amount.toFixed(2)}
        </Text>
      )}
      {order.items && (
        <Text className="text-sm text-text-secondary mt-2">
          📦 {order.items}
        </Text>
      )}
      {order.phone && (
        <Text className="text-sm text-text-secondary mt-2">
          📞 {order.phone}
        </Text>
      )}
      {order.notes && (
        <Text className="text-sm text-text-secondary mt-2">
          📝 {order.notes}
        </Text>
      )}
    </CardWrapper>
  );
}
