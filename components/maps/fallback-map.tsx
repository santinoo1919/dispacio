/**
 * Fallback Map Component
 * Shows a clean placeholder when native maps aren't available (Expo Go)
 * Displays order locations in a list format instead of a map
 */

import { View, Text, ScrollView } from "react-native";
import { Coordinates } from "@/lib/utils/geocoding";

interface OrderLocation {
  id: string;
  customerName: string;
  address: string;
  coordinates: Coordinates;
  driverName?: string;
  stopNumber?: number;
  totalStops?: number;
}

interface FallbackMapProps {
  orders: OrderLocation[];
  region?: {
    latitude: number;
    longitude: number;
    zoom?: number;
  };
}

export function FallbackMap({ orders, region }: FallbackMapProps) {
  if (orders.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-xl font-bold text-text mb-2">
          No Locations
        </Text>
        <Text className="text-base text-text-secondary text-center">
          No orders to display on the map
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Map Placeholder Header */}
      <View className="bg-background-secondary px-4 py-4 border-b border-border">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-semibold text-text">
              Map View
            </Text>
            <Text className="text-sm text-text-secondary mt-1">
              {orders.length} location{orders.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <View className="bg-background-tertiary px-3 py-1.5 rounded-lg">
            <Text className="text-xs font-medium text-text-secondary">
              Expo Go Mode
            </Text>
          </View>
        </View>
      </View>

      {/* Info Banner */}
      <View className="bg-background-tertiary px-4 py-3 border-b border-border">
        <Text className="text-sm text-text-secondary">
          💡 Native maps require a development build. Showing locations list instead.
        </Text>
      </View>

      {/* Locations List */}
      <ScrollView className="flex-1">
        <View className="px-4 py-4 space-y-3">
          {orders.map((order, index) => (
            <View
              key={order.id}
              className="bg-background-secondary rounded-lg p-4 border border-border"
            >
              <View className="flex-row items-start justify-between mb-2">
                <View className="flex-1">
                  {order.stopNumber && (
                    <View className="flex-row items-center mb-1">
                      <View className="bg-background-tertiary px-2 py-0.5 rounded mr-2">
                        <Text className="text-xs font-semibold text-text-secondary">
                          Stop {order.stopNumber}
                          {order.totalStops ? `/${order.totalStops}` : ""}
                        </Text>
                      </View>
                    </View>
                  )}
                  <Text className="text-base font-semibold text-text mb-1">
                    {order.customerName}
                  </Text>
                  <Text className="text-sm text-text-secondary mb-2">
                    {order.address}
                  </Text>
                </View>
              </View>

              {/* Coordinates */}
              <View className="flex-row items-center mt-2 pt-2 border-t border-border">
                <Text className="text-xs text-text-tertiary font-mono">
                  {order.coordinates.latitude.toFixed(6)},{" "}
                  {order.coordinates.longitude.toFixed(6)}
                </Text>
              </View>

              {order.driverName && (
                <View className="mt-2">
                  <Text className="text-xs text-text-tertiary">
                    Driver: <Text className="font-medium">{order.driverName}</Text>
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

