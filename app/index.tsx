import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../src/stores/authStore';

export default function Index() {
  const { isAuthenticated, loadStoredAuth } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      await loadStoredAuth();
      // Navigate based on auth state
      if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        router.replace('/auth');
      }
    };

    checkAuth();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
