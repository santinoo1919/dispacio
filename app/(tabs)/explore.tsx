/**
 * Map Screen
 * Shows dispatch routes on a map with markers and polylines
 *
 * SIMPLIFIED: Uses coordinates directly from CSV if available
 * Falls back to geocoding only when coordinates are missing
 */

import { View, Text, StyleSheet, Platform } from "react-native";
import { AppleMaps, GoogleMaps } from "expo-maps";
import { useMemo } from "react";
import { useDispatchContext } from "@/context/dispatch-context";
import { getOrderCoordinates, Coordinates } from "@/lib/utils/geocoding";
import { Order } from "@/lib/types";
import { DRIVERS, DRIVER_COLORS, getDriverColor } from "@/lib/data/drivers";

const UNASSIGNED_COLOR = "#9CA3AF"; // Gray for unassigned orders

export default function MapScreen() {
  const { orders } = useDispatchContext();

  // Group orders by driver and get coordinates
  // SIMPLIFIED: Uses coordinates directly from CSV if available
  const dispatchSeries = useMemo(() => {
    const series: Array<{
      driverId: string | null;
      driverName: string;
      color: string;
      orders: Array<Order & { coordinates: Coordinates }>;
    }> = [];

    // Process assigned orders by driver
    DRIVERS.forEach((driver, index) => {
      const driverOrders = orders
        .filter((order) => order.driverId === driver.id)
        .sort((a, b) => a.rank - b.rank) // Sort by rank to show route sequence
        .map((order) => ({
          ...order,
          // Use CSV coordinates if available, otherwise geocode from address
          coordinates: getOrderCoordinates(order),
        }));

      if (driverOrders.length > 0) {
        series.push({
          driverId: driver.id,
          driverName: driver.name,
          color: getDriverColor(driver.id), // Use shared color function
          orders: driverOrders,
        });
      }
    });

    // Process unassigned orders
    const unassignedOrders = orders
      .filter((order) => !order.driverId)
      .map((order) => ({
        ...order,
        // Use CSV coordinates if available, otherwise geocode from address
        coordinates: getOrderCoordinates(order),
      }));

    if (unassignedOrders.length > 0) {
      series.push({
        driverId: null,
        driverName: "Unassigned",
        color: UNASSIGNED_COLOR,
        orders: unassignedOrders,
      });
    }

    return series;
  }, [orders]);

  // Calculate map region to fit all markers
  const mapRegion = useMemo(() => {
    if (orders.length === 0) {
      // Default to Dubai center
      return {
        latitude: 25.2048,
        longitude: 55.2708,
        zoom: 10,
      };
    }

    // Get all coordinates (from CSV or geocoded)
    const allCoordinates = orders.map((order) => getOrderCoordinates(order));

    const latitudes = allCoordinates.map((c) => c.latitude);
    const longitudes = allCoordinates.map((c) => c.longitude);

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      zoom: 11,
    };
  }, [orders]);

  // Prepare markers for iOS (AppleMaps)
  const appleMarkers = useMemo(() => {
    return dispatchSeries.flatMap((series) => {
      const driver = series.driverId
        ? DRIVERS.find((d) => d.id === series.driverId)
        : null;
      const driverInitials = driver?.initials || "—";

      return series.orders.map((order, index) => ({
        id: order.id,
        coordinates: order.coordinates,
        title: `[${driverInitials}] ${order.customerName}`,
        subtitle: `Stop ${index + 1}/${series.orders.length}`,
        color: series.color,
      }));
    });
  }, [dispatchSeries]);

  // Prepare markers for Android (GoogleMaps)
  const googleMarkers = useMemo(() => {
    return dispatchSeries.flatMap((series) => {
      const driver = series.driverId
        ? DRIVERS.find((d) => d.id === series.driverId)
        : null;
      const driverInitials = driver?.initials || "—";

      return series.orders.map((order, index) => ({
        id: order.id,
        coordinates: order.coordinates,
        title: `[${driverInitials}] ${order.customerName}`,
        snippet: `Stop ${index + 1}/${series.orders.length} • ${order.address}`,
        pinColor: series.color,
      }));
    });
  }, [dispatchSeries]);

  if (orders.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900 px-6">
        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          No Dispatches Yet
        </Text>
        <Text className="text-base text-gray-600 dark:text-gray-400 text-center">
          Import CSV orders and assign them to drivers to see routes on the map
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 py-4 border-b border-gray-200 dark:border-gray-700">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">
          Dispatch Map
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {dispatchSeries.length} active dispatch
          {dispatchSeries.length !== 1 ? "es" : ""}
        </Text>
      </View>

      {/* Legend */}
      {dispatchSeries.length > 0 && (
        <View className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Text className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Routes:
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {dispatchSeries.map((series) => (
              <View
                key={series.driverId || "unassigned"}
                className="flex-row items-center"
              >
                <View
                  className="w-4 h-4 rounded-full mr-2"
                  style={{ backgroundColor: series.color }}
                />
                <Text className="text-sm text-gray-700 dark:text-gray-300">
                  {series.driverName} ({series.orders.length})
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Map */}
      {Platform.OS === "ios" ? (
        <AppleMaps.View
          style={StyleSheet.absoluteFillObject}
          cameraPosition={{
            coordinates: {
              latitude: mapRegion.latitude,
              longitude: mapRegion.longitude,
            },
            zoom: mapRegion.zoom,
          }}
          markers={appleMarkers}
        />
      ) : Platform.OS === "android" ? (
        <GoogleMaps.View
          style={StyleSheet.absoluteFillObject}
          cameraPosition={{
            coordinates: {
              latitude: mapRegion.latitude,
              longitude: mapRegion.longitude,
            },
            zoom: mapRegion.zoom,
          }}
          markers={googleMarkers}
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-600 dark:text-gray-400">
            Maps are only available on iOS and Android
          </Text>
        </View>
      )}
    </View>
  );
}
