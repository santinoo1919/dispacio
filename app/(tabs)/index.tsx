import { useRouter } from "expo-router";
import { View, Pressable, Text, TouchableOpacity } from "react-native";
import DraggableFlatList, {
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { useDispatchContext } from "@/context/dispatch-context";
import { OrderCard } from "@/components/dispatch/order-card";
import { Order } from "@/lib/types";
import * as Haptics from "expo-haptics";

export default function DispatchScreen() {
  const router = useRouter();
  const { orders, setOrders } = useDispatchContext();

  const handleDragEnd = ({ data }: { data: Order[] }) => {
    // Update ranks based on new position
    const updatedOrders = data.map((order, index) => ({
      ...order,
      rank: index + 1,
    }));
    setOrders(updatedOrders);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 py-6 border-b border-gray-200 dark:border-gray-700">
        <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Dispatch
        </Text>
        <Text className="text-base text-gray-600 dark:text-gray-400">
          Create dispatches for drivers
        </Text>
      </View>

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
      ) : (
        <View className="flex-1">
          {/* Header with Count */}
          <View className="px-4 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <View className="flex-row justify-between items-center">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                {orders.length} Orders - Drag to reorder
              </Text>
              <Pressable
                onPress={() => router.push("/paste-csv")}
                className="bg-blue-600 px-4 py-2 rounded-lg active:bg-blue-700"
              >
                <Text className="text-white font-medium">+ Add More</Text>
              </Pressable>
            </View>
          </View>

          {/* Draggable List */}
          <DraggableFlatList
            data={orders}
            onDragEnd={handleDragEnd}
            keyExtractor={(item) => item.id}
            activationDistance={10}
            renderItem={({ item, drag, isActive }) => (
              <ScaleDecorator>
                <TouchableOpacity
                  onLongPress={drag}
                  disabled={isActive}
                  className="px-4"
                >
                  <OrderCard order={item} index={item.rank - 1} />
                </TouchableOpacity>
              </ScaleDecorator>
            )}
            contentContainerStyle={{ paddingVertical: 16 }}
          />
        </View>
      )}
    </View>
  );
}
