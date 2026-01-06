/**
 * Drivers Management Screen
 * List, create, edit, and delete drivers
 */

import { ScreenHeader } from "@/components/ui/screen-header";
import {
  useCreateDriver,
  useDeleteDriver,
  useDrivers,
  useUpdateDriver,
} from "@/hooks/use-drivers";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
    email: "",
    locationLat: "",
    locationLng: "",
  });

  const handleSave = async () => {
    if (!formData.name || !formData.phone) {
      Alert.alert("Error", "Name and phone are required");
      return;
    }

    const driverData = {
      name: formData.name,
      phone: formData.phone,
      email: formData.email || undefined,
      location:
        formData.locationLat && formData.locationLng
          ? {
              lat: parseFloat(formData.locationLat),
              lng: parseFloat(formData.locationLng),
            }
          : undefined,
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
      email: "",
      locationLat: "",
      locationLng: "",
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
      email: driver.email || "",
      locationLat: driver.location?.lat?.toString() || "",
      locationLng: driver.location?.lng?.toString() || "",
    });
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData({
      name: "",
      phone: "",
      email: "",
      locationLat: "",
      locationLng: "",
    });
  };

  return (
    <View className="flex-1 bg-background">
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
            <Pressable
              onPress={() => setShowAddForm(true)}
              className="mx-4 mt-4 bg-accent-500 px-4 py-3 rounded-lg active:bg-accent-600 flex-row items-center justify-center gap-2"
            >
              <Ionicons name="add" size={20} color="white" />
              <Text className="text-white font-semibold">Add Driver</Text>
            </Pressable>
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
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                className="bg-background px-3 py-2 rounded-lg border border-border text-text mb-3"
              />

              <TextInput
                placeholder="Phone *"
                placeholderTextColor="#71717A"
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                keyboardType="phone-pad"
                className="bg-background px-3 py-2 rounded-lg border border-border text-text mb-3"
              />

              <TextInput
                placeholder="Email (optional)"
                placeholderTextColor="#71717A"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-background px-3 py-2 rounded-lg border border-border text-text mb-3"
              />

              <View className="flex-row gap-2 mb-3">
                <TextInput
                  placeholder="Latitude"
                  placeholderTextColor="#71717A"
                  value={formData.locationLat}
                  onChangeText={(text) =>
                    setFormData({ ...formData, locationLat: text })
                  }
                  keyboardType="decimal-pad"
                  className="flex-1 bg-background px-3 py-2 rounded-lg border border-border text-text"
                />
                <TextInput
                  placeholder="Longitude"
                  placeholderTextColor="#71717A"
                  value={formData.locationLng}
                  onChangeText={(text) =>
                    setFormData({ ...formData, locationLng: text })
                  }
                  keyboardType="decimal-pad"
                  className="flex-1 bg-background px-3 py-2 rounded-lg border border-border text-text"
                />
              </View>

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
            renderItem={({ item }) => (
              <View className="mx-4 mt-2 p-4 bg-background-secondary rounded-lg border border-border">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <Text className="text-text font-semibold text-lg">
                      {item.name}
                    </Text>
                    <Text className="text-text-secondary mt-1">{item.phone}</Text>
                    {item.email && (
                      <Text className="text-text-secondary text-sm mt-1">
                        {item.email}
                      </Text>
                    )}
                    {item.location && (
                      <Text className="text-text-secondary text-sm mt-1">
                        📍 {item.location.lat.toFixed(4)}, {item.location.lng.toFixed(4)}
                      </Text>
                    )}
                    {item.initials && (
                      <View className="mt-2">
                        <View className="bg-accent-500 w-8 h-8 rounded-full items-center justify-center">
                          <Text className="text-white font-semibold text-xs">
                            {item.initials}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => startEdit(item)}
                      className="p-2 active:bg-background-tertiary rounded-lg"
                    >
                      <Ionicons name="pencil" size={20} color="#71717A" />
                    </Pressable>
                    <Pressable
                      onPress={() => handleDelete(item.id, item.name)}
                      className="p-2 active:bg-background-tertiary rounded-lg"
                    >
                      <Ionicons name="trash" size={20} color="#EF4444" />
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
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

