import { AssignmentButtons } from "@/components/dispatch/assignment-buttons";
import { DriverTabs } from "@/components/dispatch/driver-tabs";
import { EmptyState } from "@/components/dispatch/empty-state";
import { NoOrdersForDriver } from "@/components/dispatch/no-orders-for-driver";
import { OrdersList } from "@/components/dispatch/orders-list";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useFilteredOrders } from "@/hooks/use-filtered-orders";
import { useOrderCounts } from "@/hooks/use-order-counts";
import { useOrderRanking } from "@/hooks/use-order-ranking";
import { useWhatsAppShare } from "@/hooks/use-whatsapp-share";
import { DRIVERS } from "@/lib/data/drivers";
import { useDispatchStore } from "@/store/dispatch-store";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

export default function DispatchScreen() {
  const {
    orders,
    setOrders,
    isDispatchMode,
    selectedOrderIds,
    toggleDispatchMode,
    toggleOrderSelection,
    assignSelectedOrders,
    clearSelection,
  } = useDispatchStore();

  const router = useRouter();
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  // Custom hooks for business logic
  const orderCounts = useOrderCounts(orders);
  const filteredOrders = useFilteredOrders(orders, selectedDriverId);
  const { handleDragEnd } = useOrderRanking({
    orders,
    setOrders,
    selectedDriverId,
  });
  const { handleShare } = useWhatsAppShare({
    selectedDriverId,
    filteredOrders,
  });

  // Event handlers
  const handleAssign = (driverId: string) => {
    assignSelectedOrders(driverId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        title="Dispatch"
        rightContent={
          <>
            {/* Only show "Import New" when orders exist */}
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
            {/* Only show Dispatch button when orders exist */}
            {orders.length > 0 && (
              <Pressable
                onPress={toggleDispatchMode}
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
          </>
        }
      />

      <DriverTabs
        drivers={DRIVERS}
        selectedDriverId={selectedDriverId}
        onSelectDriver={setSelectedDriverId}
        orderCounts={orderCounts}
      />

      {isDispatchMode && (
        <AssignmentButtons
          drivers={DRIVERS}
          selectedCount={selectedOrderIds.size}
          onAssign={handleAssign}
          onCancel={clearSelection}
        />
      )}

      {orders.length === 0 ? (
        <EmptyState />
      ) : filteredOrders.length === 0 ? (
        <NoOrdersForDriver />
      ) : (
        <OrdersList
          orders={filteredOrders}
          isDispatchMode={isDispatchMode}
          selectedOrderIds={selectedOrderIds}
          selectedDriverId={selectedDriverId}
          onDragEnd={handleDragEnd}
          onToggleSelect={toggleOrderSelection}
          onShare={handleShare}
        />
      )}
    </View>
  );
}
