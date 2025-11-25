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
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900 px-6">
        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          No Locations
        </Text>
        <Text className="text-base text-gray-600 dark:text-gray-400 text-center">
          No orders to display on the map
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Map Placeholder Header */}
      <View className="bg-white dark:bg-gray-800 px-4 py-4 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              Map View
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {orders.length} location{orders.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <View className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg">
            <Text className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Expo Go Mode
            </Text>
          </View>
        </View>
      </View>

      {/* Info Banner */}
      <View className="bg-amber-50 dark:bg-amber-900/20 px-4 py-3 border-b border-amber-200 dark:border-amber-800">
        <Text className="text-sm text-amber-800 dark:text-amber-200">
          💡 Native maps require a development build. Showing locations list instead.
        </Text>
      </View>

      {/* Locations List */}
      <ScrollView className="flex-1">
        <View className="px-4 py-4 space-y-3">
          {orders.map((order, index) => (
            <View
              key={order.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
            >
              <View className="flex-row items-start justify-between mb-2">
                <View className="flex-1">
                  {order.stopNumber && (
                    <View className="flex-row items-center mb-1">
                      <View className="bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded mr-2">
                        <Text className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                          Stop {order.stopNumber}
                          {order.totalStops ? `/${order.totalStops}` : ""}
                        </Text>
                      </View>
                    </View>
                  )}
                  <Text className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                    {order.customerName}
                  </Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {order.address}
                  </Text>
                </View>
              </View>

              {/* Coordinates */}
              <View className="flex-row items-center mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <Text className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {order.coordinates.latitude.toFixed(6)},{" "}
                  {order.coordinates.longitude.toFixed(6)}
                </Text>
              </View>

              {order.driverName && (
                <View className="mt-2">
                  <Text className="text-xs text-gray-500 dark:text-gray-400">
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

