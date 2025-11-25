/**
 * Orders List Component
 * Single Responsibility: Render draggable orders list
 */

import { View, TouchableOpacity, Pressable, Text } from "react-native";
import DraggableFlatList, {
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { Ionicons } from "@expo/vector-icons";
import { Order } from "@/lib/types";
import { OrderCard } from "./order-card";
import { getDriverById, getDriverColor } from "@/lib/data/drivers";

interface OrdersListProps {
  orders: Order[];
  isDispatchMode: boolean;
  selectedOrderIds: Set<string>;
  selectedDriverId: string | null;
  onDragEnd: (data: { data: Order[] }) => void;
  onToggleSelect: (orderId: string) => void;
  onShare: () => void;
}

export function OrdersList({
  orders,
  isDispatchMode,
  selectedOrderIds,
  selectedDriverId,
  onDragEnd,
  onToggleSelect,
  onShare,
}: OrdersListProps) {
  return (
    <View className="flex-1">
      <DraggableFlatList
        data={orders}
        onDragEnd={onDragEnd}
        keyExtractor={(item) => item.id}
        activationDistance={10}
        autoscrollThreshold={100}
        autoscrollSpeed={200}
        renderItem={({ item, drag, isActive, getIndex }) => {
          const driver = item.driverId
            ? getDriverById(item.driverId)
            : undefined;
          const index = getIndex() ?? 0;

          const isLast = index === orders.length - 1;

          return (
            <ScaleDecorator>
              {isDispatchMode ? (
                <View>
                  <OrderCard
                    order={item}
                    index={index}
                    isDispatchMode={true}
                    isSelected={selectedOrderIds.has(item.id)}
                    driverInitials={driver?.initials}
                    driverColor={getDriverColor(item.driverId)}
                    onToggleSelect={() => onToggleSelect(item.id)}
                  />
                  {!isLast && (
                    <View className="h-px bg-border w-full" />
                  )}
                </View>
              ) : (
                <TouchableOpacity
                  onLongPress={drag}
                  disabled={isActive}
                  delayLongPress={200}
                  activeOpacity={0.8}
                  style={{
                    zIndex: isActive ? 999 : 1,
                    elevation: isActive ? 8 : 1,
                    opacity: isActive ? 0.9 : 1,
                  }}
                >
                  <OrderCard
                    order={item}
                    index={index}
                    driverInitials={driver?.initials}
                    driverColor={getDriverColor(item.driverId)}
                  />
                  {!isLast && (
                    <View className="h-px bg-border w-full" />
                  )}
                </TouchableOpacity>
              )}
            </ScaleDecorator>
          );
        }}
        ListFooterComponent={
          selectedDriverId && !isDispatchMode && orders.length > 0 ? (
            <View className="px-4 py-4">
              <Pressable
                onPress={onShare}
                className="bg-status-success-background rounded-lg active:bg-status-success-border flex-row items-center justify-center gap-2 py-3"
              >
                <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                <Text className="text-white text-center font-semibold">
                  Share
                </Text>
              </Pressable>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 16 }}
      />
    </View>
  );
}

