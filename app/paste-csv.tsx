/**
 * Paste CSV Modal Screen
 * Native iOS modal for CSV input
 */

import { CSVParser } from "@/lib/csv/parser";
import { useCreateOrders } from "@/hooks/use-orders";
import { useCreateZones } from "@/hooks/use-zones";
import { useDispatchStore } from "@/store/dispatch-store";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

export default function PasteCSVScreen() {
  const router = useRouter();
  const { csvText, setCsvText, pasteFromClipboard, clear } = useDispatchStore();
  const createOrdersMutation = useCreateOrders();
  const createZonesMutation = useCreateZones();

  const handleParseAndDismiss = async () => {
    if (!csvText.trim()) {
      return;
    }

    // Parse CSV locally first
    const result = CSVParser.parse(csvText);

    if (!result.success) {
      return;
    }

    // Upload to backend (hook now accepts domain Order[] directly)
    const uploadResult = await createOrdersMutation.mutateAsync(result.orders);

    if (uploadResult.success) {
      // Cluster orders and create zones in backend
      const { ZoneClusterer } = await import("@/lib/clustering/zone-clusterer");
      const zoneClusterer = new ZoneClusterer();

      // Upload result already contains domain Order[] format
      // Cluster orders locally
      const clusteredZones = zoneClusterer.clusterOrders(uploadResult.orders);

      // Create zones in backend with order assignments
      const zonesToCreate = clusteredZones.map((zone) => ({
        name: zone.id,
        center: zone.center,
        orderIds: zone.orders
          .map((o) => o.serverId)
          .filter(Boolean) as string[],
      }));

      if (zonesToCreate.length > 0) {
        await createZonesMutation.mutateAsync(zonesToCreate);
      }

      // Success - navigate back
      router.back();
    }
  };

  const handleClear = () => {
    clear();
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="bg-background-secondary px-6 py-4 border-b border-border">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="py-2">
            <Text className="text-text-secondary font-semibold text-base">
              Cancel
            </Text>
          </Pressable>
          <Text className="text-lg font-bold text-text">Add CSV Orders</Text>
          <View className="w-16" />
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView className="flex-1" contentContainerClassName="p-6">
        {/* Paste Button */}
        <Pressable
          onPress={pasteFromClipboard}
          className="bg-background-secondary px-4 py-3 rounded-lg mb-4 active:bg-background-tertiary"
        >
          <Text className="text-accent-600 font-medium text-center">
            Copy from clipboard
          </Text>
        </Pressable>

        {/* Text Input - takes all space */}
        <TextInput
          value={csvText}
          onChangeText={setCsvText}
          placeholder="Paste your CSV data here...
Or tap 'From Clipboard' above"
          placeholderTextColor="#71717A"
          multiline
          className="border border-border rounded-lg p-4 bg-background-secondary text-text text-base flex-1"
          style={{
            textAlignVertical: "top",
          }}
        />
      </ScrollView>

      {/* Sticky Bottom Buttons */}
      <View className="border-t border-border bg-background px-6 py-4">
        <View className="flex-row gap-3">
          <Pressable
            onPress={handleParseAndDismiss}
            disabled={createOrdersMutation.isPending || !csvText.trim()}
            className={`flex-1 py-4 rounded-lg ${
              createOrdersMutation.isPending || !csvText.trim()
                ? "bg-gray-400"
                : "bg-accent-600  active:bg-accent-700"
            }`}
          >
            <Text className="text-white text-center font-semibold text-base">
              {createOrdersMutation.isPending ? "⏳ Parsing..." : "Parse CSV"}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleClear}
            className="bg-background-secondary px-6 py-4 rounded-lg active:bg-background-tertiary"
          >
            <Text className="text-white font-semibold">Clear</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
