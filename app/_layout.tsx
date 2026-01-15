import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { QueryProvider } from "@/lib/react-query/client";
import { toastConfig } from "@/lib/utils/toast";
import "../global.css";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryProvider>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="paste-csv"
                options={{ presentation: "modal", headerShown: false }}
              />
              <Stack.Screen
                name="zone-detail"
                options={{ presentation: "modal", headerShown: false }}
              />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
          <Toast config={toastConfig} />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </QueryProvider>
  );
}
