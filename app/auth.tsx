import { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, useTheme, ActivityIndicator, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { useGoogleAuth, getUserInfo } from '../src/services/googleAuth';

export default function AuthScreen() {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setAuth } = useAuthStore();

  const { request, response, promptAsync } = useGoogleAuth();

  useEffect(() => {
    handleAuthResponse();
  }, [response]);

  const handleAuthResponse = async () => {
    if (response?.type === 'success') {
      setIsLoading(true);
      setError(null);

      try {
        const { authentication } = response;
        if (authentication?.accessToken) {
          console.log('Got access token, fetching user info...');
          const userInfo = await getUserInfo(authentication.accessToken);

          setAuth({
            isAuthenticated: true,
            isGuest: false,
            accessToken: authentication.accessToken,
            userEmail: userInfo.email || null,
            userName: userInfo.name || null,
          });

          router.replace('/(tabs)');
        } else {
          setError('No access token received');
        }
      } catch (err) {
        console.error('Auth error:', err);
        setError('Failed to complete sign in');
      } finally {
        setIsLoading(false);
      }
    } else if (response?.type === 'error') {
      setError(response.error?.message || 'Sign in failed');
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await promptAsync();
    } catch (err) {
      console.error('Prompt error:', err);
      setError('Failed to start sign in');
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
          <MaterialCommunityIcons
            name="book-heart-outline"
            size={80}
            color={theme.colors.primary}
            style={styles.icon}
          />
          <Text variant="displaySmall" style={[styles.title, { color: theme.colors.primary }]}>
            Our Journal
          </Text>
          <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Family Journal & Task Tracker
          </Text>
        </View>

        <Surface style={styles.buttonContainer} elevation={0}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text variant="bodyMedium" style={styles.loadingText}>
                Signing in...
              </Text>
            </View>
          ) : (
            <>
              <Button
                mode="contained"
                onPress={handleGoogleSignIn}
                style={styles.button}
                icon="google"
                contentStyle={styles.buttonContent}
                disabled={!request}
              >
                Sign in with Google
              </Button>

              <View style={styles.dividerContainer}>
                <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
                <Text variant="bodySmall" style={[styles.orText, { color: theme.colors.onSurfaceVariant }]}>
                  or
                </Text>
                <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
              </View>

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
            <Surface style={[styles.errorContainer, { backgroundColor: theme.colors.errorContainer }]} elevation={0}>
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color={theme.colors.error} />
              <Text variant="bodyMedium" style={{ color: theme.colors.error, flex: 1 }}>
                {error}
              </Text>
            </Surface>
          )}
        </Surface>
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
    marginBottom: 48,
  },
  icon: {
    marginBottom: 16,
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
    maxWidth: 320,
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    opacity: 0.7,
  },
  button: {
    width: '100%',
    marginVertical: 6,
    borderRadius: 28,
  },
  buttonContent: {
    paddingVertical: 10,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  orText: {
    marginHorizontal: 16,
  },
  guestNote: {
    marginTop: 24,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    width: '100%',
  },
});
