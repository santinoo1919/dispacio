/**
 * Drivers Management Screen
 * List, create, edit, and delete drivers
 */

import { DriverCard } from "@/components/dispatch/driver-card";
import { ScreenHeader } from "@/components/ui/screen-header";
import {
  useCreateDriver,
  useDeleteDriver,
  useDrivers,
  useUpdateDriver,
} from "@/hooks/use-drivers";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

export default function DriversScreen() {
  const { data: drivers, isLoading } = useDrivers({ is_active: true });
  const createDriver = useCreateDriver();
  const updateDriver = useUpdateDriver();
  const deleteDriver = useDeleteDriver();
  const router = useRouter();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    locationName: "",
  });

  const handleSave = async () => {
    if (!formData.name || !formData.phone) {
      Alert.alert("Error", "Name and phone are required");
      return;
    }

    const driverData = {
      name: formData.name,
      phone: formData.phone,
      // Store location name in email field for now (will be proper field later)
      email: formData.locationName || undefined,
    };

    if (editingId) {
      await updateDriver.mutateAsync({
        driverId: editingId,
        updates: driverData,
      });
      setEditingId(null);
    } else {
      await createDriver.mutateAsync(driverData);
      setShowAddForm(false);
    }

    // Reset form
    setFormData({
      name: "",
      phone: "",
      locationName: "",
    });
  };

  const handleDelete = (driverId: string, driverName: string) => {
    Alert.alert(
      "Delete Driver",
      `Are you sure you want to delete ${driverName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteDriver.mutate(driverId),
        },
      ]
    );
  };

  const startEdit = (driver: any) => {
    setEditingId(driver.id);
    setFormData({
      name: driver.name,
      phone: driver.phone,
      locationName: driver.email || "",
    });
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData({
      name: "",
      phone: "",
      locationName: "",
    });
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="Drivers"
        rightContent={
          <Pressable onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#71717A" />
          </Pressable>
        }
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <>
          {!showAddForm && (
            <View className="px-4 pt-4">
              <Pressable
                onPress={() => setShowAddForm(true)}
                className="bg-background-secondary px-4 py-2 rounded-lg active:bg-background-tertiary border border-border"
              >
                <Text className="text-text-secondary font-medium text-sm">
                  Add Driver
                </Text>
              </Pressable>
            </View>
          )}

          {showAddForm && (
            <View className="mx-4 mt-4 p-4 bg-background-secondary rounded-lg border border-border">
              <Text className="text-text font-semibold text-lg mb-4">
                {editingId ? "Edit Driver" : "Add Driver"}
              </Text>

              <TextInput
                placeholder="Name *"
                placeholderTextColor="#71717A"
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
                className="bg-background px-3 py-2 rounded-lg border border-border text-text mb-3"
              />

              <TextInput
                placeholder="Phone *"
                placeholderTextColor="#71717A"
                value={formData.phone}
                onChangeText={(text) =>
                  setFormData({ ...formData, phone: text })
                }
                keyboardType="phone-pad"
                className="bg-background px-3 py-2 rounded-lg border border-border text-text mb-3"
              />

              <TextInput
                placeholder="Location Name (optional)"
                placeholderTextColor="#71717A"
                value={formData.locationName}
                onChangeText={(text) =>
                  setFormData({ ...formData, locationName: text })
                }
                className="bg-background px-3 py-2 rounded-lg border border-border text-text mb-3"
              />

              <View className="flex-row gap-2">
                <Pressable
                  onPress={cancelEdit}
                  className="flex-1 bg-background-tertiary px-4 py-2 rounded-lg active:bg-background"
                >
                  <Text className="text-text-secondary text-center font-medium">
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  disabled={createDriver.isPending || updateDriver.isPending}
                  className="flex-1 bg-accent-500 px-4 py-2 rounded-lg active:bg-accent-600"
                >
                  <Text className="text-white text-center font-medium">
                    {createDriver.isPending || updateDriver.isPending
                      ? "Saving..."
                      : "Save"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          <FlatList
            data={drivers || []}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => {
              const isLast = index === (drivers?.length || 0) - 1;
              return (
                <View>
                  <DriverCard
                    driver={item}
                    index={index}
                    onEdit={() => startEdit(item)}
                    onDelete={() => handleDelete(item.id, item.name)}
                  />
                  {!isLast && <View className="h-px bg-border w-full" />}
                </View>
              );
            }}
            contentContainerStyle={{ paddingBottom: 16 }}
            ListEmptyComponent={
              <View className="items-center justify-center p-8 mt-8">
                <Ionicons name="people-outline" size={48} color="#71717A" />
                <Text className="text-text-secondary text-center mt-4">
                  No drivers yet. Add your first driver to get started.
                </Text>
              </View>
            }
          />
        </>
      )}
    </View>
  );
}
