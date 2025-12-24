import { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Button, Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { router } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { signInWithGoogle } from '../src/services/googleAuth';

export default function AuthScreen() {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setAuth } = useAuthStore();

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await signInWithGoogle();
      if (result.success) {
        setAuth({
          isAuthenticated: true,
          isGuest: false,
          accessToken: result.accessToken,
          userEmail: result.email,
          userName: result.name,
        });
        router.replace('/(tabs)');
      } else {
        setError(result.error || 'Sign in failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestMode = () => {
    setAuth({
      isAuthenticated: true,
      isGuest: true,
      accessToken: null,
      userEmail: null,
      userName: 'Guest',
    });
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="displaySmall" style={[styles.title, { color: theme.colors.primary }]}>
            Our Journal
          </Text>
          <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Family Journal & Task Tracker
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" />
          ) : (
            <>
              <Button
                mode="contained"
                onPress={handleGoogleSignIn}
                style={styles.button}
                icon="google"
                contentStyle={styles.buttonContent}
              >
                Sign in with Google
              </Button>

              <Text variant="bodySmall" style={[styles.orText, { color: theme.colors.onSurfaceVariant }]}>
                or
              </Text>

              <Button
                mode="outlined"
                onPress={handleGuestMode}
                style={styles.button}
                icon="account-outline"
                contentStyle={styles.buttonContent}
              >
                Continue as Guest
              </Button>

              <Text variant="bodySmall" style={[styles.guestNote, { color: theme.colors.onSurfaceVariant }]}>
                Guest mode stores data locally only.{'\n'}
                Sign in with Google to backup to Drive.
              </Text>
            </>
          )}

          {error && (
            <Text variant="bodyMedium" style={[styles.error, { color: theme.colors.error }]}>
              {error}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  button: {
    width: '100%',
    marginVertical: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  orText: {
    marginVertical: 16,
  },
  guestNote: {
    marginTop: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  error: {
    marginTop: 16,
    textAlign: 'center',
  },
});
