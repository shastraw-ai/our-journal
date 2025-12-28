import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { useColorScheme } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../src/stores/authStore';
import { useSettingsStore } from '../src/stores/settingsStore';
import { configureGoogleSignIn, signInSilently } from '../src/services/googleAuth';
import { notificationService } from '../src/services/notificationService';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? MD3DarkTheme : MD3LightTheme;
  const { loadStoredAuth, setAuth } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      // Configure Google Sign-In
      configureGoogleSignIn();

      // Load stored auth state
      await loadStoredAuth();

      // Get current state after loading
      const state = useAuthStore.getState();

      // If user was previously authenticated with Google (not guest), try silent sign-in
      if (state.isAuthenticated && !state.isGuest) {
        const result = await signInSilently();
        if (result.success) {
          // Update with fresh token
          setAuth({
            accessToken: result.accessToken || null,
          });
        }
      }
    };

    initAuth();
  }, []);

  // Initialize notification categories and response listener
  useEffect(() => {
    const initNotifications = async () => {
      // Setup notification categories for interactive Yes/No buttons
      await notificationService.setupNotificationCategories();
    };

    initNotifications();

    // Set up response listener for notification actions
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      notificationService.handleNotificationResponse
    );

    return () => {
      responseSubscription.remove();
    };
  }, []);

  // Sync notifications when settings are loaded
  useEffect(() => {
    let previousMembersJson = '';

    const unsubscribe = useSettingsStore.subscribe((state) => {
      const currentMembersJson = JSON.stringify(state.members);
      // Only sync if members actually changed
      if (state.members.length > 0 && currentMembersJson !== previousMembersJson) {
        previousMembersJson = currentMembersJson;
        notificationService.rescheduleAllReminders(state.members);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <PaperProvider theme={theme}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </PaperProvider>
  );
}
