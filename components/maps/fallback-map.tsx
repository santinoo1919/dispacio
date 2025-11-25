/**
 * Fallback Map Component
 * Shows a clean placeholder when native maps aren't available (Expo Go)
 * Displays order locations in a list format instead of a map
 */

import { View, Text, ScrollView } from "react-native";
import { Coordinates } from "@/lib/utils/geocoding";
import { OrderCard } from "@/components/dispatch/order-card";

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
        <View>
          {orders.map((order, index) => {
            const isLast = index === orders.length - 1;
            return (
              <View key={order.id}>
                <OrderCard
                  order={{
                    id: order.id,
                    customerName: order.customerName,
                    address: order.address,
                    rawData: {},
                    rank: index + 1,
                  }}
                  index={index}
                  variant="location"
                  stopNumber={order.stopNumber}
                  totalStops={order.totalStops}
                  showCoordinates={true}
                  coordinates={order.coordinates}
                  driverName={order.driverName}
                />
                {!isLast && (
                  <View className="h-px bg-border w-full" />
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

