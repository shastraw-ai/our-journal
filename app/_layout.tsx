import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { useColorScheme } from 'react-native';
import { useAuthStore } from '../src/stores/authStore';
import { configureGoogleSignIn, signInSilently } from '../src/services/googleAuth';

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
