/**
 * Toast Utility & Configuration
 * Provides a clean API for showing toast messages matching app design tokens
 * Includes both the utility functions and visual configuration
 */

import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import Toast from "react-native-toast-message";

// Visual configuration matching app design tokens
export const toastConfig = {
  success: ({ text1, text2 }: { text1?: string; text2?: string }) => (
    <View className="bg-status-success px-4 py-3 rounded-lg mx-4 border border-green-600 flex-row items-center shadow-lg">
      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
      <View className="ml-2 flex-1">
        {text1 && (
          <Text className="text-white font-semibold text-base">{text1}</Text>
        )}
        {text2 && <Text className="text-white/90 text-sm mt-0.5">{text2}</Text>}
      </View>
    </View>
  ),

  error: ({ text1, text2 }: { text1?: string; text2?: string }) => (
    <View className="bg-red-500 px-4 py-3 rounded-lg mx-4 border border-red-600 flex-row items-center shadow-lg">
      <Ionicons name="close-circle" size={20} color="#FFF7ED" />
      <View className="ml-2 flex-1">
        {text1 && (
          <Text className="text-white font-semibold text-base">{text1}</Text>
        )}
        {text2 && <Text className="text-white/90 text-sm mt-0.5">{text2}</Text>}
      </View>
    </View>
  ),

  info: ({ text1, text2 }: { text1?: string; text2?: string }) => (
    <View className="bg-background-tertiary px-4 py-3 rounded-lg mx-4 border border-border flex-row items-center shadow-lg">
      <Ionicons name="information-circle" size={20} color="#A1A1AA" />
      <View className="ml-2 flex-1">
        {text1 && (
          <Text className="text-text font-semibold text-base">{text1}</Text>
        )}
        {text2 && (
          <Text className="text-text-secondary text-sm mt-0.5">{text2}</Text>
        )}
      </View>
    </View>
  ),
};

// Utility functions for showing toasts
export const showToast = {
  success: (message: string, subtitle?: string) => {
    Toast.show({
      type: "success",
      text1: message,
      text2: subtitle,
      position: "top",
      visibilityTime: 3000,
    });
  },

  error: (message: string, subtitle?: string) => {
    Toast.show({
      type: "error",
      text1: message,
      text2: subtitle,
      position: "top",
      visibilityTime: 4000,
    });
  },

  info: (message: string, subtitle?: string) => {
    Toast.show({
      type: "info",
      text1: message,
      text2: subtitle,
      position: "top",
      visibilityTime: 3000,
    });
  },
};
