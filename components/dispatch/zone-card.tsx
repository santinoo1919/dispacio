/**
 * Zone Card Component
 * Shows zone with orders in routing sequence, driver selection, and optimize button
 */

import { Card } from "@/components/ui/card";
import { useOptimizeRoute } from "@/hooks/use-routes";
import { getDriverById, getDriverColor } from "@/lib/data/drivers";
import { Zone } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

interface ZoneCardProps {
  zone: Zone;
  index: number;
  onPress?: () => void; // Optional - for opening details modal
}

export function ZoneCard({ zone, index, onPress }: ZoneCardProps) {
  const optimizeRouteMutation = useOptimizeRoute();

  // Sort orders by rank (optimized sequence)
  const sortedOrders = useMemo(() => {
    return [...zone.orders].sort((a, b) => {
      if (a.rank && b.rank) return a.rank - b.rank;
      if (a.rank && !b.rank) return -1;
      if (!a.rank && b.rank) return 1;
      return 0;
    });
  }, [zone.orders]);

  const assignedDriverId = zone.assignedDriverId;
  const driver = assignedDriverId ? getDriverById(assignedDriverId) : undefined;
  const driverColor = getDriverColor(assignedDriverId);

  // Extract zone number
  const zoneNumberMatch = zone.id.match(/\d+/);
  const zoneNumber = zoneNumberMatch
    ? parseInt(zoneNumberMatch[0], 10)
    : index + 1;

  // Optimize route (driver is auto-assigned)
  const handleOptimize = async () => {
    if (!assignedDriverId) return;

    // Get order UUIDs for backend
    const orderIds = zone.orders
      .map((o) => o.serverId)
      .filter(Boolean) as string[];

    if (orderIds.length === 0) return;

    // Ensure driver is assigned in backend
    const { getBackendDriverId } = await import("@/lib/data/drivers");
    const backendDriverId = getBackendDriverId(assignedDriverId);
    if (backendDriverId && orderIds.length > 0) {
      const { bulkAssignDriver } = await import("@/lib/services/api");
      await bulkAssignDriver(orderIds, backendDriverId).catch(() => {});
    }

    await optimizeRouteMutation.mutateAsync({
      driverId: assignedDriverId,
      orderIds,
    });
  };

  const isOptimizingThisZone = optimizeRouteMutation.isPending;
  const hasOptimizedRoute = sortedOrders.some((o) => o.rank);

  return (
    <Card variant="zone" isSelected={false}>
      {/* Zone Header */}
      <View className="flex-row items-start mb-3">
        <View className="bg-background-tertiary w-8 h-8 rounded-full items-center justify-center mr-3">
          <Text className="text-text font-semibold text-base">
            {zoneNumber}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-lg font-semibold text-text">{zone.id}</Text>
          <View className="flex-row items-center mt-1">
            <Ionicons name="cube-outline" size={16} color="#A1A1AA" />
            <Text className="text-sm text-text-secondary ml-1">
              {zone.orderCount} {zone.orderCount === 1 ? "order" : "orders"}
            </Text>
            {hasOptimizedRoute && (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color="#22C55E"
                  style={{ marginLeft: 8 }}
                />
                <Text className="text-sm text-green-600 ml-1">Optimized</Text>
              </>
            )}
          </View>
        </View>
        <View className="ml-2 flex-row items-center gap-2">
          {driver && (
            <View
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: driverColor || "#71717A" }}
            >
              <Text className="text-white font-semibold text-sm">
                {driver.initials}
              </Text>
            </View>
          )}
          {onPress && (
            <Pressable onPress={onPress}>
              <Ionicons name="chevron-forward" size={24} color="#71717A" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Optimize Button */}
      <Pressable
        onPress={handleOptimize}
        disabled={
          isOptimizingThisZone || zone.orders.length === 0 || !assignedDriverId
        }
        className={`mb-3 bg-accent-600 rounded-lg py-2.5 px-4 flex-row items-center justify-center ${
          isOptimizingThisZone || zone.orders.length === 0 || !assignedDriverId
            ? "opacity-50"
            : "active:bg-accent-700"
        }`}
      >
        {isOptimizingThisZone ? (
          <>
            <ActivityIndicator color="#fff" size="small" />
            <Text className="text-white font-semibold text-sm ml-2">
              Optimizing...
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="navigate" size={18} color="#fff" />
            <Text className="text-white font-semibold text-sm ml-2">
              Optimize Route
            </Text>
          </>
        )}
      </Pressable>

      {/* Orders List (Routing Sequence) */}
      <View className="mt-2">
        {sortedOrders.map((order, orderIndex) => {
          const stopNumber = order.rank || orderIndex + 1;
          return (
            <View
              key={order.id}
              className="mb-2 pb-2 border-b border-border last:border-b-0"
            >
              <View className="flex-row items-start">
                <View className="bg-background-tertiary w-6 h-6 rounded-full items-center justify-center mr-2 mt-0.5">
                  <Text className="text-xs font-semibold text-text">
                    {stopNumber}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-medium text-text">
                    {order.customerName}
                  </Text>
                  <Text className="text-sm text-text-secondary mt-0.5">
                    {order.address}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}
