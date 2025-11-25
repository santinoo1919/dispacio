import { View, Text, Pressable } from "react-native";
import { Driver } from "@/lib/types";

interface AssignmentButtonsProps {
  drivers: Driver[];
  selectedCount: number;
  onAssign: (driverId: string) => void;
  onCancel: () => void;
}

export function AssignmentButtons({
  drivers,
  selectedCount,
  onAssign,
  onCancel,
}: AssignmentButtonsProps) {
  if (selectedCount === 0) return null;

  return (
    <View className="bg-background-secondary border-b border-border px-4 py-3">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-sm font-semibold text-text">
          {selectedCount} selected
        </Text>
        <Pressable onPress={onCancel}>
          <Text className="text-sm text-text-secondary font-medium">
            Cancel
          </Text>
        </Pressable>
      </View>
      <View className="flex-row gap-2">
        {drivers.map((driver) => (
          <Pressable
            key={driver.id}
            onPress={() => onAssign(driver.id)}
            className="flex-1 bg-accent-600 px-3 py-2 rounded-lg active:bg-accent-700"
          >
            <Text className="text-white text-center font-semibold text-sm">
              → {driver.initials}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
