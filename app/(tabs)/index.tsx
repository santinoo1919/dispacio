import { EmptyState } from "@/components/dispatch/empty-state";
import { ZoneCard } from "@/components/dispatch/zone-card";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useZones } from "@/lib/domains/zones/zones.queries";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";

export default function DispatchScreen() {
  const { data: zones, isLoading } = useZones();
  const router = useRouter();

  // Derive orders from zones
  const orders = zones?.flatMap((z) => z.orders) || [];

  const handleZonePress = (zoneId: string) => {
    // Optional: Open details modal for full order information
    router.push(`/zone-detail?zoneId=${encodeURIComponent(zoneId)}`);
  };

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        title="Dispatch"
        rightContent={
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={() => router.push("/drivers")}
              className="p-2 active:bg-background-tertiary rounded-lg"
            >
              <Ionicons name="settings-outline" size={24} color="#71717A" />
            </Pressable>
            {orders.length > 0 && (
              <Pressable
                onPress={() => router.push("/paste-csv")}
                className="bg-background-secondary px-4 py-2 rounded-lg active:bg-background-tertiary border border-border"
              >
                <Text className="text-text-secondary font-medium text-sm">
                  Import New
                </Text>
              </Pressable>
            )}
          </View>
        }
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : orders.length === 0 ? (
        <EmptyState />
      ) : zones && zones.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-text-secondary text-center">
            No zones available. Please import CSV data.
          </Text>
        </View>
      ) : (
        <FlatList
          data={zones || []}
          keyExtractor={(item) => item.serverId || item.id}
          renderItem={({ item, index }) => {
            const isLast = index === (zones?.length || 0) - 1;
            return (
              <View>
                <ZoneCard
                  zone={item}
                  index={index}
                  onPress={() => handleZonePress(item.id)}
                />
                {!isLast && <View className="h-px bg-border w-full" />}
              </View>
            );
          }}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      )}
    </View>
  );
}
