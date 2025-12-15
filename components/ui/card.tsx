/**
 * Base Card Component
 * Single Responsibility: Provides consistent card styling and structure
 * Used as foundation for all card variants
 */

import { ReactNode } from "react";
import { View, ViewProps } from "react-native";

interface CardProps extends ViewProps {
  children: ReactNode;
  variant?: "default" | "compact" | "location" | "zone";
  isSelected?: boolean;
  className?: string;
}

export function Card({
  children,
  variant = "default",
  isSelected = false,
  className = "",
  ...props
}: CardProps) {
  const baseClasses = "bg-background-secondary";

  const variantClasses = {
    default: "p-4",
    compact: "p-3",
    location: "p-4",
    zone: "p-4",
  };

  const selectedClasses = isSelected ? "bg-accent-600/10" : "";

  return (
    <View
      className={`${baseClasses} ${variantClasses[variant]} ${selectedClasses} ${className}`}
      {...props}
    >
      {children}
    </View>
  );
}
