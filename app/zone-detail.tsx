/**
 * Zone Detail Modal Screen
 * Shows orders in a zone with driver selection and WhatsApp sharing
 */

import { OrderCard } from "@/components/dispatch/order-card";
import { ScreenHeader } from "@/components/ui/screen-header";
import { DRIVERS, getDriverById, getDriverColor } from "@/lib/data/drivers";
import { calculateOrderDistance } from "@/lib/utils/distance";
import { showToast } from "@/lib/utils/toast";
import {
  generateWhatsAppMessage,
  shareToWhatsApp,
} from "@/lib/utils/whatsapp-share";
import { useDispatchStore } from "@/store/dispatch-store";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

export default function ZoneDetailScreen() {
  const router = useRouter();
  const { zoneId } = useLocalSearchParams<{ zoneId: string }>();
  const { zones, assignDriverToZone, optimizeRoute, isOptimizing } =
    useDispatchStore();
  const [optimizedResult, setOptimizedResult] = useState<{
    totalDistance: number;
    totalDuration: number;
  } | null>(null);

  const zone = zones.find((z) => z.id === zoneId);
  const zoneOrders = zone?.orders ?? [];
  const assignedDriverId = zone?.assignedDriverId;

  // Calculate distances between consecutive orders
  const orderDistances = useMemo(() => {
    const distances: (number | null)[] = [];
    for (let i = 0; i < zoneOrders.length; i++) {
      if (i < zoneOrders.length - 1) {
        const distance = calculateOrderDistance(
          zoneOrders[i],
          zoneOrders[i + 1]
        );
        distances.push(distance);
      } else {
        distances.push(null); // Last order has no next order
      }
    }
    return distances;
  }, [zoneOrders]);

  const handleDriverSelect = async (driverId: string) => {
    if (!zoneId) return;
    await assignDriverToZone(zoneId, driverId);
    showToast.success("Driver Assigned", "Driver assigned to zone");
    setOptimizedResult(null); // Reset optimization result when driver changes
  };

  const handleOptimizeRoute = async () => {
    if (!assignedDriverId) {
      showToast.error("No Driver", "Please select a driver first");
      return;
    }

    const orderIds = zoneOrders
      .map((o) => o.serverId || o.id)
      .filter(Boolean) as string[];
    const result = await optimizeRoute(assignedDriverId, orderIds);

    if (result) {
      setOptimizedResult({
        totalDistance: result.totalDistance,
        totalDuration: result.totalDuration,
      });
    }
  };

  const handleShare = async () => {
    const driverId = assignedDriverId;
    if (!driverId || zoneOrders.length === 0) {
      showToast.error("No Driver", "Please select a driver first");
      return;
    }

    const driver = getDriverById(driverId);
    if (!driver) {
      showToast.error("Error", "Driver not found");
      return;
    }

    try {
      const message = generateWhatsAppMessage(driver, zoneOrders);
      await shareToWhatsApp(driver.phone, message);
      showToast.success("Shared", "WhatsApp message opened");
      // Close modal after sharing
      setTimeout(() => {
        router.back();
      }, 500);
    } catch (error) {
      showToast.error("Error", "Failed to open WhatsApp");
    }
  };

  if (!zone) {
    return (
      <View className="flex-1 bg-background">
        <ScreenHeader
          title="Zone Not Found"
          rightContent={
            <Pressable onPress={() => router.back()}>
              <Text className="text-text-secondary font-medium text-sm">
                Close
              </Text>
            </Pressable>
          }
        />
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-text-secondary text-center">
            Zone not found. Please go back and try again.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        title={`${zone.id} - ${zone.orderCount} ${
          zone.orderCount === 1 ? "Order" : "Orders"
        }`}
        rightContent={
          <Pressable onPress={() => router.back()}>
            <Text className="text-text-secondary font-medium text-sm">
              Close
            </Text>
          </Pressable>
        }
      />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Driver Selection Section */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-text mb-3">
            Select Driver
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {DRIVERS.map((driver) => {
              const isSelected = assignedDriverId === driver.id;
              const driverColor = getDriverColor(driver.id);
              return (
                <Pressable
                  key={driver.id}
                  onPress={() => handleDriverSelect(driver.id)}
                  className={`px-4 py-3 rounded-lg border-2 ${
                    isSelected
                      ? "bg-background-secondary border-accent-600"
                      : "bg-background-tertiary border-border"
                  }`}
                >
                  <View className="flex-row items-center">
                    <View
                      className="w-4 h-4 rounded-full mr-2"
                      style={{ backgroundColor: driverColor }}
                    />
                    <Text
                      className={`font-semibold ${
                        isSelected ? "text-text" : "text-text-secondary"
                      }`}
                    >
                      {driver.initials}
                    </Text>
                  </View>
                  <Text
                    className={`text-sm mt-1 ${
                      isSelected ? "text-text" : "text-text-secondary"
                    }`}
                  >
                    {driver.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Optimize Route Section */}
        {assignedDriverId && (
          <View className="mb-6">
            <Pressable
              onPress={handleOptimizeRoute}
              disabled={isOptimizing || zoneOrders.length === 0}
              className={`bg-accent-600 rounded-lg py-4 px-4 flex-row items-center justify-center ${
                isOptimizing || zoneOrders.length === 0
                  ? "opacity-50"
                  : "active:bg-accent-700"
              }`}
            >
              {isOptimizing ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text className="text-white font-semibold text-base ml-2">
                    Optimizing...
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="navigate" size={20} color="#fff" />
                  <Text className="text-white font-semibold text-base ml-2">
                    Optimize Route
                  </Text>
                </>
              )}
            </Pressable>

            {optimizedResult && (
              <View className="mt-3 bg-background-secondary p-3 rounded-lg">
                <Text className="text-text font-semibold mb-1">
                  Route Optimized
                </Text>
                <View className="flex-row items-center mt-1">
                  <Ionicons name="navigate-outline" size={16} color="#A1A1AA" />
                  <Text className="text-text-secondary text-sm ml-1">
                    Total Distance: {optimizedResult.totalDistance.toFixed(1)}{" "}
                    km
                  </Text>
                </View>
                <View className="flex-row items-center mt-1">
                  <Ionicons name="time-outline" size={16} color="#A1A1AA" />
                  <Text className="text-text-secondary text-sm ml-1">
                    Estimated Duration:{" "}
                    {Math.round(optimizedResult.totalDuration / 60)} min
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Orders List */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-text mb-3">Orders</Text>
          {zoneOrders.map((order, index) => {
            const driver = order.driverId
              ? getDriverById(order.driverId)
              : undefined;
            return (
              <View key={order.id} className="mb-3">
                <OrderCard
                  order={order}
                  index={index}
                  driverInitials={driver?.initials}
                  driverColor={getDriverColor(order.driverId)}
                  distanceToNext={orderDistances[index]}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* WhatsApp Share Button */}
      <View className="border-t border-border bg-background px-6 py-4">
        <Pressable
          onPress={handleShare}
          disabled={!assignedDriverId || zoneOrders.length === 0}
          className={`bg-green-600 rounded-lg py-4 ${
            !assignedDriverId || zoneOrders.length === 0
              ? "opacity-50"
              : "active:bg-green-700"
          }`}
        >
          <Text className="text-white text-center font-semibold text-base">
            Share via WhatsApp
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
