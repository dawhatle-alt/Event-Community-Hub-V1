import {
  CormorantGaramond_300Light,
  CormorantGaramond_300Light_Italic,
  CormorantGaramond_400Regular,
  CormorantGaramond_400Regular_Italic,
  CormorantGaramond_500Medium,
  CormorantGaramond_500Medium_Italic,
  CormorantGaramond_600SemiBold,
} from "@expo-google-fonts/cormorant-garamond";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setBaseUrl } from "@workspace/api-client-react";
import { AuthProvider, useAuth } from "@/context/auth";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { useRouter, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { requestNotificationPermissions, registerPushTokenWithServer } from "@/lib/notifications";

const API_BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
const TOKEN_KEY = "bb_session_token";

async function getStoredAuthToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

// Set API base URL for Expo (runs outside the web proxy)
setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const notificationResponseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") return;

    notificationResponseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as {
          eventId?: number;
          screen?: string;
        };
        if (data?.eventId && data?.screen === "event") {
          router.push(`/event/${data.eventId}`);
        }
      }
    );

    return () => {
      notificationResponseListener.current?.remove();
    };
  }, [router]);

  // Register the device push token with the server whenever the user is signed in.
  // This ensures the server can deliver push notifications even when the app is closed.
  useEffect(() => {
    if (!isAuthenticated || Platform.OS === "web") return;
    registerPushTokenWithServer(API_BASE_URL, getStoredAuthToken);
  }, [isAuthenticated]);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="event/[id]"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="event/register"
        options={{ headerShown: false, animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="confirmation"
        options={{ headerShown: false, animation: "fade" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    CormorantGaramond_300Light,
    CormorantGaramond_300Light_Italic,
    CormorantGaramond_400Regular,
    CormorantGaramond_400Regular_Italic,
    CormorantGaramond_500Medium,
    CormorantGaramond_500Medium_Italic,
    CormorantGaramond_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
