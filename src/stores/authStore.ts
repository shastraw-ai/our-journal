import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { AuthState } from '../types';

interface AuthStore extends AuthState {
  setAuth: (auth: Partial<AuthState>) => void;
  logout: () => void;
  loadStoredAuth: () => Promise<void>;
  saveAuth: () => Promise<void>;
}

const STORAGE_KEY = 'auth_state';

export const useAuthStore = create<AuthStore>((set, get) => ({
  isAuthenticated: false,
  isGuest: false,
  accessToken: null,
  refreshToken: null,
  userEmail: null,
  userName: null,

  setAuth: (auth) => {
    set((state) => ({ ...state, ...auth }));
    get().saveAuth();
  },

  logout: async () => {
    set({
      isAuthenticated: false,
      isGuest: false,
      accessToken: null,
      refreshToken: null,
      userEmail: null,
      userName: null,
    });
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  },

  loadStoredAuth: async () => {
    try {
      const stored = await SecureStore.getItemAsync(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        set(parsed);
      }
    } catch (error) {
      console.error('Failed to load auth state:', error);
    }
  },

  saveAuth: async () => {
    try {
      const state = get();
      const toStore: AuthState = {
        isAuthenticated: state.isAuthenticated,
        isGuest: state.isGuest,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        userEmail: state.userEmail,
        userName: state.userName,
      };
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(toStore));
    } catch (error) {
      console.error('Failed to save auth state:', error);
    }
  },
}));
