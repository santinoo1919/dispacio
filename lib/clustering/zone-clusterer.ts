import Supercluster from "supercluster";

import { Order, Zone } from "@/lib/types";

type ClusterProperties = {
  orderId: string;
  order: Order;
};

type ClusterFeature = {
  type: "Feature";
  properties: ClusterProperties;
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
};

type ClusterResult = {
  type: "Feature";
  properties:
    | (ClusterProperties & { cluster?: false })
    | {
        cluster: true;
        cluster_id: number;
        point_count: number;
        point_count_abbreviated: number;
      };
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
};

export class ZoneClusterer {
  private clusterer: Supercluster<ClusterProperties, any>;

  constructor(options?: {
    radius?: number;
    maxZoom?: number;
    minPoints?: number;
  }) {
    this.clusterer = new Supercluster<ClusterProperties>({
      radius: options?.radius ?? 80, // Smaller radius = more, smaller zones (was 120)
      maxZoom: options?.maxZoom ?? 14,
      minZoom: 0,
      minPoints: options?.minPoints ?? 2,
    });
  }

  clusterOrders(orders: Order[]): Zone[] {
    const withCoords = orders.filter(
      (order) =>
        typeof order.latitude === "number" &&
        typeof order.longitude === "number" &&
        !Number.isNaN(order.latitude) &&
        !Number.isNaN(order.longitude)
    );

    const withoutCoords = orders.filter(
      (order) =>
        order.latitude === undefined ||
        order.longitude === undefined ||
        Number.isNaN(order.latitude) ||
        Number.isNaN(order.longitude)
    );

    if (withCoords.length === 0) {
      return withoutCoords.length
        ? [
            {
              id: "Unassigned Zone",
              center: { lat: 0, lng: 0 },
              orders: withoutCoords,
              orderCount: withoutCoords.length,
            },
          ]
        : [];
    }

    const features: ClusterFeature[] = withCoords.map((order) => ({
      type: "Feature",
      properties: {
        orderId: order.id,
        order,
      },
      geometry: {
        type: "Point",
        coordinates: [order.longitude as number, order.latitude as number],
      },
    }));

    this.clusterer.load(features);

    const bbox = this.computeBoundingBox(withCoords);
    // Lower zoom level = larger zones (fewer zones)
    // We want fewer, larger zones, not many small ones
    const orderCount = withCoords.length;
    let zoomLevel = 9; // Default: lower zoom = fewer zones
    if (orderCount > 50) {
      zoomLevel = 10; // Slightly higher for very many orders, but still fewer zones
    } else {
      zoomLevel = 9; // Always use lower zoom for fewer, larger zones
    }
    const clusters = this.clusterer.getClusters(
      bbox,
      zoomLevel
    ) as ClusterResult[];

    // Number zones sequentially: Zone 1, Zone 2, Zone 3...
    let zoneNumber = 1;
    const zones: Zone[] = clusters.map((cluster) => {
      const [lng, lat] = cluster.geometry.coordinates;

      if (cluster.properties && (cluster.properties as any).cluster) {
        const clusterId = (cluster.properties as any).cluster_id;
        const leaves = this.clusterer.getLeaves(clusterId, Infinity);
        const zoneOrders = leaves.map((leaf: ClusterFeature) => leaf.properties.order);
        const zoneId = `Zone ${zoneNumber++}`;

        return {
          id: zoneId,
          center: { lat, lng },
          orders: zoneOrders,
          orderCount: (cluster.properties as any).point_count,
        };
      }

      const singleOrder = (cluster.properties as ClusterProperties).order;
      const zoneId = `Zone ${zoneNumber++}`;
      return {
        id: zoneId,
        center: { lat, lng },
        orders: [singleOrder],
        orderCount: 1,
      };
    });

    if (withoutCoords.length) {
      zones.push({
        id: "Unassigned Zone",
        center: { lat: 0, lng: 0 },
        orders: withoutCoords,
        orderCount: withoutCoords.length,
      });
    }

    return zones;
  }

  private computeBoundingBox(
    orders: Order[]
  ): [number, number, number, number] {
    let minLat = Number.POSITIVE_INFINITY;
    let minLng = Number.POSITIVE_INFINITY;
    let maxLat = Number.NEGATIVE_INFINITY;
    let maxLng = Number.NEGATIVE_INFINITY;

    orders.forEach((order) => {
      if (order.latitude == null || order.longitude == null) return;
      minLat = Math.min(minLat, order.latitude);
      minLng = Math.min(minLng, order.longitude);
      maxLat = Math.max(maxLat, order.latitude);
      maxLng = Math.max(maxLng, order.longitude);
    });

    // Fallback to world bounds if something went wrong
    if (
      !Number.isFinite(minLat) ||
      !Number.isFinite(minLng) ||
      !Number.isFinite(maxLat) ||
      !Number.isFinite(maxLng)
    ) {
      return [-180, -85, 180, 85];
    }

    // Add slight padding to avoid zero-area bbox
    const padding = 0.01;
    return [
      minLng - padding,
      minLat - padding,
      maxLng + padding,
      maxLat + padding,
    ];
  }
}
