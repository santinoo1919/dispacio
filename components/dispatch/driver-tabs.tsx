import { View, Text, Pressable, ScrollView } from "react-native";
import { Driver } from "@/lib/types";

interface DriverTabsProps {
  drivers: Driver[];
  selectedDriverId: string | null;
  onSelectDriver: (driverId: string | null) => void;
  orderCounts: Record<string, number>;
}

export function DriverTabs({
  drivers,
  selectedDriverId,
  onSelectDriver,
  orderCounts,
}: DriverTabsProps) {
  const unassignedCount = orderCounts["unassigned"] || 0;

  return (
    <View className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4 py-2 gap-2"
      >
        {/* All Tab */}
        <Pressable
          onPress={() => onSelectDriver(null)}
          className={`px-4 py-2 rounded-lg ${
            selectedDriverId === null
              ? "bg-blue-600"
              : "bg-gray-100 dark:bg-gray-700"
          }`}
        >
          <Text
            className={`font-semibold ${
              selectedDriverId === null
                ? "text-white"
                : "text-gray-700 dark:text-gray-300"
            }`}
          >
            All ({unassignedCount})
          </Text>
        </Pressable>

        {/* Driver Tabs */}
        {drivers.map((driver) => (
          <Pressable
            key={driver.id}
            onPress={() => onSelectDriver(driver.id)}
            className={`px-4 py-2 rounded-lg ${
              selectedDriverId === driver.id
                ? "bg-blue-600"
                : "bg-gray-100 dark:bg-gray-700"
            }`}
          >
            <Text
              className={`font-semibold ${
                selectedDriverId === driver.id
                  ? "text-white"
                  : "text-gray-700 dark:text-gray-300"
              }`}
            >
              {driver.initials} ({orderCounts[driver.id] || 0})
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
