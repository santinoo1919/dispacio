/**
 * Screen Header Component
 * Shared header component for consistent styling across screens
 * Handles safe area insets, background, and layout
 */

import { ReactNode } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ScreenHeaderProps {
  title: string;
  rightContent?: ReactNode;
}

export function ScreenHeader({ title, rightContent }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="bg-background px-4 border-b border-border"
      style={{ paddingTop: insets.top + 16, paddingBottom: 16 }}
    >
      <View className="flex-row justify-between items-center">
        <Text className="text-3xl font-bold text-text">{title}</Text>
        {rightContent && <View className="flex-row gap-2">{rightContent}</View>}
      </View>
    </View>
  );
}

