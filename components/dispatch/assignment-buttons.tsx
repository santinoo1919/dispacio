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
    <View className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-3">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-sm font-semibold text-blue-900 dark:text-blue-100">
          {selectedCount} selected
        </Text>
        <Pressable onPress={onCancel}>
          <Text className="text-sm text-blue-600 dark:text-blue-400 font-medium">
            Cancel
          </Text>
        </Pressable>
      </View>
      <View className="flex-row gap-2">
        {drivers.map((driver) => (
          <Pressable
            key={driver.id}
            onPress={() => onAssign(driver.id)}
            className="flex-1 bg-blue-600 px-3 py-2 rounded-lg active:bg-blue-700"
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
