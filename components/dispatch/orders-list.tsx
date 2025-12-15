/**
 * Orders List Component
 * Single Responsibility: Render draggable orders list
 */

import { getDriverById, getDriverColor } from "@/lib/data/drivers";
import { Order, Zone } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, TouchableOpacity, View } from "react-native";
import DraggableFlatList, {
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { OrderCard } from "./order-card";

interface OrdersListProps {
  orders: Order[];
  zones: Zone[];
  isDispatchMode: boolean;
  selectedOrderIds: Set<string>;
  selectedDriverId: string | null;
  onDragEnd: (data: { data: Order[] }) => void;
  onToggleSelect: (orderId: string) => void;
  onShare: () => void;
}

export function OrdersList({
  orders,
  zones,
  isDispatchMode,
  selectedOrderIds,
  selectedDriverId,
  onDragEnd,
  onToggleSelect,
  onShare,
}: OrdersListProps) {
  const zoneByOrderId = buildZoneLookup(zones);
  const headersByOrderId = buildHeaders(orders, zoneByOrderId);

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
          const orderZone = zoneByOrderId.get(item.id);
          const header = headersByOrderId.get(item.id);
          const driver = item.driverId
            ? getDriverById(item.driverId)
            : undefined;
          const index = getIndex() ?? 0;

          const isLast = index === orders.length - 1;

          return (
            <View>
              {header ? (
                <View className="bg-background-secondary px-4 py-2">
                  <Text className="text-text-secondary font-semibold">
                    {header.title} ({header.count})
                  </Text>
                </View>
              ) : null}

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
                    {!isLast && <View className="h-px bg-border w-full" />}
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
                    {!isLast && <View className="h-px bg-border w-full" />}
                  </TouchableOpacity>
                )}
              </ScaleDecorator>
            </View>
          );
        }}
        ListFooterComponent={
          selectedDriverId && !isDispatchMode && orders.length > 0 ? (
            <View className="px-4 py-8">
              <Pressable
                onPress={onShare}
                className="bg-background-secondary rounded-lg active:bg-green-700 flex-row items-center justify-center gap-2 py-3"
              >
                <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                <Text className="text-white text-center font-semibold">
                  Share Dispatch
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

function buildZoneLookup(zones: Zone[]): Map<string, Zone> {
  const map = new Map<string, Zone>();
  zones.forEach((zone) => {
    zone.orders.forEach((order) => {
      map.set(order.id, zone);
    });
  });
  return map;
}

function countOrdersByZone(
  orders: Order[],
  zoneByOrderId: Map<string, Zone>
): Map<string, number> {
  const counts = new Map<string, number>();
  orders.forEach((order) => {
    const zoneId = zoneByOrderId.get(order.id)?.id ?? "zone-unassigned";
    counts.set(zoneId, (counts.get(zoneId) ?? 0) + 1);
  });
  return counts;
}

function buildHeaders(
  orders: Order[],
  zoneByOrderId: Map<string, Zone>
): Map<string, { title: string; count: number }> {
  const headers = new Map<string, { title: string; count: number }>();
  const zoneCounts = countOrdersByZone(orders, zoneByOrderId);

  let lastZoneId: string | null = null;
  orders.forEach((order) => {
    const zone = zoneByOrderId.get(order.id);
    const zoneId = zone?.id ?? "zone-unassigned";

    if (zoneId !== lastZoneId) {
      headers.set(order.id, {
        title: zone?.id === "zone-unassigned" ? "Unassigned Zone" : zoneId,
        count: zoneCounts.get(zoneId) ?? 0,
      });
    }

    lastZoneId = zoneId;
  });

  return headers;
}
