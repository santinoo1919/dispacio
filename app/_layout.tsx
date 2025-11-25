import "react-native-reanimated";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import "../global.css";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { DispatchProvider } from "@/context/dispatch-context";
import { toastConfig } from "@/lib/utils/toast";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <DispatchProvider>
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="paste-csv"
                options={{ presentation: "modal", headerShown: false }}
              />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </DispatchProvider>
        <Toast config={toastConfig} />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
