import { EmptyState } from "@/components/dispatch/empty-state";
import { ZoneCard } from "@/components/dispatch/zone-card";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useDispatchStore } from "@/store/dispatch-store";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

export default function DispatchScreen() {
  const { orders, zones, fetchOrdersFromAPI } = useDispatchStore();
  const router = useRouter();

  // Fetch orders from API on mount
  useEffect(() => {
    fetchOrdersFromAPI();
  }, []);

  const handleZonePress = (zoneId: string) => {
    router.push(`/zone-detail?zoneId=${encodeURIComponent(zoneId)}`);
  };

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        title="Dispatch"
        rightContent={
          orders.length > 0 && (
            <Pressable
              onPress={() => router.push("/paste-csv")}
              className="bg-background-secondary px-4 py-2 rounded-lg active:bg-background-tertiary border border-border"
            >
              <Text className="text-text-secondary font-medium text-sm">
                Import New
              </Text>
            </Pressable>
          )
        }
      />

      {orders.length === 0 ? (
        <EmptyState />
      ) : zones.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-text-secondary text-center">
            No zones available. Please import CSV data.
          </Text>
        </View>
      ) : (
        <FlatList
          data={zones}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const isLast = index === zones.length - 1;
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
