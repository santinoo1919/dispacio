/**
 * Zone Card Component
 * Wrapper for OrderCard with zone variant
 * Reuses the same styling and structure as order cards
 */

import { OrderCard } from "@/components/dispatch/order-card";
import { getDriverById, getDriverColor } from "@/lib/data/drivers";
import { Zone } from "@/lib/types";

interface ZoneCardProps {
  zone: Zone;
  index: number;
  onPress: () => void;
}

export function ZoneCard({ zone, index, onPress }: ZoneCardProps) {
  const driver = zone.assignedDriverId
    ? getDriverById(zone.assignedDriverId)
    : undefined;

  return (
    <OrderCard
      variant="zone"
      zone={zone}
      index={index}
      driverInitials={driver?.initials}
      driverColor={getDriverColor(zone.assignedDriverId)}
      onPress={onPress}
    />
  );
}
