import { useRouter } from "expo-router";
import { useState, useMemo } from "react";
import { View, Pressable, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DraggableFlatList, {
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { useDispatchContext } from "@/context/dispatch-context";
import { OrderCard } from "@/components/dispatch/order-card";
import { DriverTabs } from "@/components/dispatch/driver-tabs";
import { AssignmentButtons } from "@/components/dispatch/assignment-buttons";
import { Order } from "@/lib/types";
import { DRIVERS, getDriverById, getDriverColor } from "@/lib/data/drivers";
import {
  generateWhatsAppMessage,
  shareToWhatsApp,
} from "@/lib/utils/whatsapp-share";
import * as Haptics from "expo-haptics";

export default function DispatchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  // Compute order counts per driver
  const orderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    DRIVERS.forEach((driver) => {
      counts[driver.id] = orders.filter((o) => o.driverId === driver.id).length;
    });
    // Count unassigned orders for "All" tab
    counts["unassigned"] = orders.filter((o) => !o.driverId).length;
    return counts;
  }, [orders]);

  // Filter orders by selected driver
  // "All" tab shows only unassigned orders, driver tabs show their assigned orders
  const filteredOrders = useMemo(() => {
    if (selectedDriverId === null) {
      // Show only unassigned orders in "All" tab
      return orders.filter((order) => !order.driverId);
    }
    return orders.filter((order) => order.driverId === selectedDriverId);
  }, [orders, selectedDriverId]);

  const handleDragEnd = ({ data }: { data: Order[] }) => {
    // Update ranks based on new position (within current filter context)
    const updatedFiltered = data.map((order, index) => ({
      ...order,
      rank: index + 1,
    }));

    // If filtering by driver, update ranks only for that driver's orders
    // Otherwise update all orders
    const updatedOrders = orders.map((order) => {
      if (selectedDriverId !== null && order.driverId !== selectedDriverId) {
        return order; // Don't touch orders from other drivers
      }

      const updated = updatedFiltered.find((o) => o.id === order.id);
      return updated || order;
    });

    setOrders(updatedOrders);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAssign = (driverId: string) => {
    assignSelectedOrders(driverId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleShareToWhatsApp = async () => {
    if (!selectedDriverId || filteredOrders.length === 0) return;

    const driver = getDriverById(selectedDriverId);
    if (!driver) return;

    try {
      const message = generateWhatsAppMessage(driver, filteredOrders);
      await shareToWhatsApp(driver.phone, message);
    } catch (error) {
      console.error("Failed to share:", error);
    }
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View
        className="bg-white dark:bg-gray-800 px-4 py-6 border-b border-gray-200 dark:border-gray-700"
        style={{ paddingTop: insets.top + 16 }}
      >
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-3xl font-bold text-gray-900 dark:text-white">
            Dispatch
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => router.push("/paste-csv")}
              className="bg-blue-600 px-4 py-2 rounded-lg active:bg-blue-700"
            >
              <Text className="text-white font-medium text-sm">Import CSV</Text>
            </Pressable>
            <Pressable
              onPress={toggleDispatchMode}
              className={`px-4 py-2 rounded-lg ${
                isDispatchMode
                  ? "bg-green-600 active:bg-green-700"
                  : "bg-blue-600 active:bg-blue-700"
              }`}
            >
              <Text className="text-white font-medium text-sm">
                {isDispatchMode ? "Done" : "Dispatch"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Driver Tabs */}
      <DriverTabs
        drivers={DRIVERS}
        selectedDriverId={selectedDriverId}
        onSelectDriver={setSelectedDriverId}
        orderCounts={orderCounts}
      />

      {/* Assignment Buttons */}
      {isDispatchMode && (
        <AssignmentButtons
          drivers={DRIVERS}
          selectedCount={selectedOrderIds.size}
          onAssign={handleAssign}
          onCancel={clearSelection}
        />
      )}

      {/* Empty State or Orders List */}
      {orders.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <View className="items-center mb-8">
            <View className="bg-blue-100 dark:bg-blue-900/30 w-24 h-24 rounded-full items-center justify-center mb-4">
              <Text className="text-5xl">📋</Text>
            </View>
            <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No Orders Yet
            </Text>
            <Text className="text-base text-gray-600 dark:text-gray-400 text-center">
              Add your CSV orders to start creating dispatches
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/paste-csv")}
            className="bg-blue-600 px-8 py-4 rounded-xl active:bg-blue-700"
          >
            <Text className="text-white font-semibold text-lg">
              + Add Orders
            </Text>
          </Pressable>
        </View>
      ) : filteredOrders.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg text-gray-600 dark:text-gray-400 text-center">
            No orders for this driver
          </Text>
        </View>
      ) : (
        <View className="flex-1">
          {/* Draggable List */}
          <DraggableFlatList
            data={filteredOrders}
            onDragEnd={handleDragEnd}
            keyExtractor={(item) => item.id}
            activationDistance={10}
            autoscrollThreshold={100}
            autoscrollSpeed={200}
            renderItem={({ item, drag, isActive, getIndex }) => {
              const driver = item.driverId
                ? getDriverById(item.driverId)
                : undefined;
              const index = getIndex() ?? 0;

              return (
                <ScaleDecorator>
                  {isDispatchMode ? (
                    <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                      <OrderCard
                        order={item}
                        index={index}
                        isDispatchMode={true}
                        isSelected={selectedOrderIds.has(item.id)}
                        driverInitials={driver?.initials}
                        driverColor={getDriverColor(item.driverId)}
                        onToggleSelect={() => toggleOrderSelection(item.id)}
                      />
                    </View>
                  ) : (
                    <TouchableOpacity
                      onLongPress={drag}
                      disabled={isActive}
                      delayLongPress={200}
                      activeOpacity={0.8}
                      style={{
                        paddingHorizontal: 16,
                        marginBottom: 12,
                        zIndex: isActive ? 999 : 1,
                        elevation: isActive ? 8 : 1,
                        opacity: isActive ? 0.9 : 1,
                      }}
                    >
                      <OrderCard
                        order={item}
                        index={index}
                        driverInitials={driver?.initials}
                        driverColor={getDriverColor(item.driverId)}
                      />
                    </TouchableOpacity>
                  )}
                </ScaleDecorator>
              );
            }}
            ListFooterComponent={
              selectedDriverId &&
              !isDispatchMode &&
              filteredOrders.length > 0 ? (
                <View className="px-4 py-4">
                  <Pressable
                    onPress={handleShareToWhatsApp}
                    className="bg-green-500 rounded-lg active:bg-green-600 flex-row items-center justify-center gap-2 py-3"
                  >
                    <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                    <Text className="text-white text-center font-semibold">
                      Share
                    </Text>
                  </Pressable>
                </View>
              ) : null
            }
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 16 }}
          />
        </View>
      )}
    </View>
  );
}
