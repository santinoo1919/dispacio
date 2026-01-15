/**
 * Driver Card Component
 * Shows driver information with consistent styling matching ZoneCard
 */

import { Card } from "@/components/ui/card";
import { Driver } from "@/lib/domains/drivers/drivers.types";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

interface DriverCardProps {
  driver: Driver;
  index: number;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function DriverCard({ driver, index, onEdit, onDelete }: DriverCardProps) {
  return (
    <Card variant="zone" isSelected={false}>
      {/* Driver Header */}
      <View className="flex-row items-start">
        <View className="bg-background-tertiary w-8 h-8 rounded-full items-center justify-center mr-3">
          <Text className="text-text font-semibold text-base">
            {driver.initials || index + 1}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-lg font-semibold text-text">{driver.name}</Text>
          <View className="flex-row items-center mt-1">
            <Ionicons name="call-outline" size={16} color="#A1A1AA" />
            <Text className="text-sm text-text-secondary ml-1">{driver.phone}</Text>
          </View>
          {driver.email && (
            <View className="flex-row items-center mt-1">
              <Ionicons name="location-outline" size={16} color="#A1A1AA" />
              <Text className="text-sm text-text-secondary ml-1">{driver.email}</Text>
            </View>
          )}
        </View>
        <View className="ml-2 flex-row items-center gap-2">
          {driver.initials && (
            <View
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: driver.color || "#71717A" }}
            >
              <Text className="text-white font-semibold text-sm">
                {driver.initials}
              </Text>
            </View>
          )}
          {onEdit && (
            <Pressable
              onPress={onEdit}
              className="p-2 active:bg-background-tertiary rounded-lg"
            >
              <Ionicons name="pencil" size={20} color="#71717A" />
            </Pressable>
          )}
          {onDelete && (
            <Pressable
              onPress={onDelete}
              className="p-2 active:bg-background-tertiary rounded-lg"
            >
              <Ionicons name="trash" size={20} color="#EF4444" />
            </Pressable>
          )}
        </View>
      </View>
    </Card>
  );
}

