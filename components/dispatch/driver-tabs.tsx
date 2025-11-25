import { Driver } from "@/lib/types";
import { Pressable, ScrollView, Text, View } from "react-native";

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
    <View className="bg-background-primary border-b border-border">
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
              ? "bg-background-tertiary "
              : "bg-background-tertiary"
          }`}
        >
          <Text
            className={`font-semibold ${
              selectedDriverId === null ? "text-text" : "text-text-secondary"
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
                ? "bg-background-tertiary"
                : "bg-background-tertiary"
            }`}
          >
            <Text
              className={`font-semibold ${
                selectedDriverId === driver.id
                  ? "text-text"
                  : "text-text-secondary"
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
