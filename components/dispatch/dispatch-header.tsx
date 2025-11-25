/**
 * Dispatch Header Component
 * Single Responsibility: Render header with title and action buttons
 */

import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface DispatchHeaderProps {
  hasOrders: boolean;
  isDispatchMode: boolean;
  onToggleDispatchMode: () => void;
}

export function DispatchHeader({
  hasOrders,
  isDispatchMode,
  onToggleDispatchMode,
}: DispatchHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="bg-background-primary px-4 border-b border-border"
      style={{ paddingTop: insets.top + 16, paddingBottom: 16 }}
    >
      <View className="flex-row justify-between items-center">
        <Text className="text-3xl font-bold text-text">Dispatch</Text>
        <View className="flex-row gap-2">
          {/* Only show "Import New" when orders exist */}
          {hasOrders && (
            <Pressable
              onPress={() => router.push("/paste-csv")}
              className="bg-background-secondary px-4 py-2 rounded-lg active:bg-background-tertiary border border-border"
            >
              <Text className="text-text-secondary font-medium text-sm">
                Import New
              </Text>
            </Pressable>
          )}
          {/* Only show Dispatch button when orders exist */}
          {hasOrders && (
            <Pressable
              onPress={onToggleDispatchMode}
              className={`px-4 py-2 rounded-lg ${
                isDispatchMode
                  ? "bg-green-600 active:bg-green-700"
                  : "bg-accent-600 active:bg-accent-700"
              }`}
            >
              <Text className="text-white font-medium text-sm">
                {isDispatchMode ? "Done" : "Dispatch"}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
