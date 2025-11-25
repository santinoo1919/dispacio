import { AssignmentButtons } from "@/components/dispatch/assignment-buttons";
import { DispatchHeader } from "@/components/dispatch/dispatch-header";
import { DriverTabs } from "@/components/dispatch/driver-tabs";
import { EmptyState } from "@/components/dispatch/empty-state";
import { NoOrdersForDriver } from "@/components/dispatch/no-orders-for-driver";
import { OrdersList } from "@/components/dispatch/orders-list";
import { useDispatchContext } from "@/context/dispatch-context";
import { useFilteredOrders } from "@/hooks/use-filtered-orders";
import { useOrderCounts } from "@/hooks/use-order-counts";
import { useOrderRanking } from "@/hooks/use-order-ranking";
import { useWhatsAppShare } from "@/hooks/use-whatsapp-share";
import { DRIVERS } from "@/lib/data/drivers";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { View } from "react-native";

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
  } = useDispatchContext();

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
      <DispatchHeader
        hasOrders={orders.length > 0}
        isDispatchMode={isDispatchMode}
        onToggleDispatchMode={toggleDispatchMode}
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
