/**
 * Map Screen
 * Shows dispatch routes on a map with markers and polylines
 *
 * SIMPLIFIED: Uses coordinates directly from CSV if available
 * Falls back to geocoding only when coordinates are missing
 * Gracefully handles Expo Go by showing fallback UI when native maps aren't available
 */

import { FallbackMap } from "@/components/maps/fallback-map";
import { ScreenHeader } from "@/components/ui/screen-header";
import { DRIVERS, getDriverColor } from "@/lib/data/drivers";
import { Order } from "@/lib/types";
import { Coordinates, getOrderCoordinates } from "@/lib/utils/geocoding";
import { isNativeMapAvailable } from "@/lib/utils/map-availability";
import { useDispatchStore } from "@/store/dispatch-store";
import { useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

// Conditionally import native maps (only if available)
const getMapModule = (moduleName: "AppleMaps" | "GoogleMaps"): any => {
  if (isNativeMapAvailable()) {
    try {
      const expoMaps = require("expo-maps");
      return expoMaps[moduleName];
    } catch (error) {
      // Silently fail - will use fallback
    }
  }
  return null;
};

const AppleMaps = getMapModule("AppleMaps");
const GoogleMaps = getMapModule("GoogleMaps");

// Use zinc-500 for unassigned orders (from design tokens)
const UNASSIGNED_COLOR = "#71717A"; // zinc-500

export default function MapScreen() {
  const { orders } = useDispatchStore();

  // Group orders by driver and get coordinates
  // SIMPLIFIED: Uses coordinates directly from CSV if available
  const dispatchSeries = useMemo(() => {
    const series: {
      driverId: string | null;
      driverName: string;
      color: string;
      orders: (Order & { coordinates: Coordinates })[];
    }[] = [];

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

  // Prepare markers for iOS (AppleMaps) with SF Symbols and driver colors
  const appleMarkers = useMemo(() => {
    return dispatchSeries.flatMap((series) => {
      return series.orders.map((order, index) => {
        const stopNumber = index + 1;
        return {
          id: order.id,
          coordinates: order.coordinates,
          systemImage: "shippingbox.fill", // SF Symbol for delivery/order
          tintColor: series.color, // Driver color
          title: `${stopNumber}. ${order.customerName}`, // Stop number + customer name as title
          subtitle: `Stop ${stopNumber}/${series.orders.length}`, // Stop number as subtitle
        };
      });
    });
  }, [dispatchSeries]);

  // Prepare polylines for iOS (AppleMaps) - colored routes per driver
  const applePolylines = useMemo(() => {
    return dispatchSeries
      .filter((series) => series.orders.length > 1) // Only show polylines for routes with multiple stops
      .map((series) => ({
        id: series.driverId || "unassigned",
        coordinates: series.orders.map((order) => order.coordinates),
        color: series.color, // Driver-specific color
        width: 3,
      }));
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
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-xl font-bold text-text mb-2">
          No Dispatches Yet
        </Text>
        <Text className="text-base text-text-secondary text-center">
          Import CSV orders and assign them to drivers to see routes on the map
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <ScreenHeader title="Map" />

      {/* Legend */}
      {dispatchSeries.length > 0 && (
        <View className="bg-background-secondary px-4 py-3 border-b border-border">
          <Text className="text-sm font-semibold text-text mb-2">Routes:</Text>
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
                <Text className="text-sm text-text-secondary">
                  {series.driverName} ({series.orders.length})
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Map */}
      {isNativeMapAvailable() && AppleMaps && GoogleMaps ? (
        // Native maps available (development build)
        Platform.OS === "ios" ? (
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
            polylines={applePolylines}
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
            <Text className="text-text-secondary">
              Maps are only available on iOS and Android
            </Text>
          </View>
        )
      ) : (
        // Fallback: Show list view when native maps aren't available (Expo Go)
        <FallbackMap
          orders={dispatchSeries.flatMap((series) =>
            series.orders.map((order, index) => ({
              id: order.id,
              customerName: order.customerName,
              address: order.address,
              coordinates: order.coordinates,
              driverName: series.driverName,
              stopNumber: index + 1,
              totalStops: series.orders.length,
            }))
          )}
          region={mapRegion}
        />
      )}
    </View>
  );
}
