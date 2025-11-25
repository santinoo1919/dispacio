/**
 * Order Card Component
 * Unified card component for displaying orders
 * Supports multiple variants: default, compact, location
 */

import { Card } from "@/components/ui/card";
import { Order } from "@/lib/types";
import { Coordinates } from "@/lib/utils/geocoding";
import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, Text, View } from "react-native";

// Internal helper components
function NumberBadge({
  number,
  size = "md",
}: {
  number: number;
  size?: "sm" | "md";
}) {
  const sizeClasses = size === "sm" ? "w-6 h-6" : "w-8 h-8";
  const textSize = size === "sm" ? "text-sm" : "text-base";

  return (
    <View
      className={`bg-background-tertiary ${sizeClasses} rounded-full items-center justify-center mr-3`}
    >
      <Text className={`text-text font-semibold ${textSize}`}>{number}</Text>
    </View>
  );
}

function CustomerInfo({
  customerName,
  address,
}: {
  customerName: string;
  address: string;
}) {
  return (
    <View className="flex-1">
      <Text className="text-lg font-semibold text-text">{customerName}</Text>
      <Text className="text-base text-text-secondary mt-1">{address}</Text>
    </View>
  );
}

// Extract number from items string (e.g., "5 items" -> 5, "3x" -> 3)
function parseItemCount(items: string): number | null {
  const match = items.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

function OrderDetails({
  order,
  showCoordinates = false,
  coordinates,
}: {
  order: Order;
  showCoordinates?: boolean;
  coordinates?: Coordinates;
}) {
  const itemCount = order.items ? parseItemCount(order.items) : null;

  return (
    <View>
      {order.amount && (
        <View className="flex-row items-center mt-2">
          <Ionicons name="cash-outline" size={18} color="#F97316" />
          <Text className="text-base font-semibold text-accent-500 ml-1">
            DH {order.amount.toFixed(2)}
          </Text>
        </View>
      )}
      {itemCount !== null && (
        <View className="flex-row items-center mt-2">
          <Ionicons name="cube-outline" size={18} color="#A1A1AA" />
          <Text className="text-base text-text-secondary ml-1">
            {itemCount}
          </Text>
        </View>
      )}
      {order.notes && (
        <View className="flex-row items-start mt-2">
          <Ionicons name="document-text-outline" size={18} color="#A1A1AA" />
          <Text className="text-base text-text-secondary ml-1 flex-1">
            {order.notes}
          </Text>
        </View>
      )}
      {showCoordinates && coordinates && (
        <View className="flex-row items-center mt-2 pt-2 border-t border-border">
          <Text className="text-sm text-text-tertiary font-mono">
            {coordinates.latitude.toFixed(6)},{" "}
            {coordinates.longitude.toFixed(6)}
          </Text>
        </View>
      )}
    </View>
  );
}

function StopBadge({
  stopNumber,
  totalStops,
}: {
  stopNumber: number;
  totalStops?: number;
}) {
  return (
    <View className="flex-row items-center mb-1">
      <View className="bg-background-tertiary px-2 py-0.5 rounded mr-2">
        <Text className="text-sm font-semibold text-text-secondary">
          Stop {stopNumber}
          {totalStops ? `/${totalStops}` : ""}
        </Text>
      </View>
    </View>
  );
}

interface OrderCardProps {
  order: Order;
  index: number;
  variant?: "default" | "compact" | "location";
  isDispatchMode?: boolean;
  isSelected?: boolean;
  driverInitials?: string;
  driverColor?: string;
  onToggleSelect?: () => void;
  // Location variant props
  stopNumber?: number;
  totalStops?: number;
  showCoordinates?: boolean;
  coordinates?: Coordinates;
  driverName?: string;
}

export function OrderCard({
  order,
  index,
  variant = "default",
  isDispatchMode = false,
  isSelected = false,
  driverInitials,
  driverColor,
  onToggleSelect,
  stopNumber,
  totalStops,
  showCoordinates = false,
  coordinates,
  driverName,
}: OrderCardProps) {
  const CardWrapper = isDispatchMode ? Pressable : View;
  const cardProps = isDispatchMode ? { onPress: onToggleSelect } : {};

  return (
    <CardWrapper {...cardProps}>
      <Card variant={variant} isSelected={isSelected}>
        {/* Header with Order Number */}
        <View className="flex-row items-start mb-2">
          <NumberBadge number={index + 1} />
          <View className="flex-1">
            {variant === "location" && stopNumber && (
              <StopBadge stopNumber={stopNumber} totalStops={totalStops} />
            )}
            <CustomerInfo
              customerName={order.customerName}
              address={order.address}
            />
          </View>
          <View className="ml-2 flex-row items-center gap-2">
            {order.phone && (
              <Pressable
                onPress={() => {
                  const phoneUrl = `tel:${order.phone}`;
                  Linking.openURL(phoneUrl).catch((err) =>
                    console.error("Failed to open phone:", err)
                  );
                }}
              >
                <Ionicons name="call" size={22} color="#F97316" />
              </Pressable>
            )}
            {isDispatchMode ? (
              <View
                className={`w-6 h-6 rounded border-2 items-center justify-center ${
                  isSelected
                    ? "bg-accent-600 border-accent-600"
                    : "border-border bg-background"
                }`}
              >
                {isSelected && (
                  <Text className="text-white text-sm font-bold">✓</Text>
                )}
              </View>
            ) : driverInitials ? (
              <View
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: driverColor || "#71717A" }}
              >
                <Text className="text-white font-semibold text-sm">
                  {driverInitials}
                </Text>
              </View>
            ) : variant !== "location" ? (
              // Only show draggable icon for non-location variants
              <Text className="text-2xl text-text-tertiary">⋮⋮</Text>
            ) : null}
          </View>
        </View>

        {/* Order Details */}
        <OrderDetails
          order={order}
          showCoordinates={showCoordinates}
          coordinates={coordinates}
        />

        {/* Driver Name (for location variant) */}
        {variant === "location" && driverName && (
          <View className="mt-2">
            <Text className="text-sm text-text-tertiary">
              Driver: <Text className="font-medium">{driverName}</Text>
            </Text>
          </View>
        )}
      </Card>
    </CardWrapper>
  );
}
