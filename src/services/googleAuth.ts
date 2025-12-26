import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';

// Get client IDs from app config
const getClientIds = () => {
  const extra = Constants.expoConfig?.extra;
  if (!extra?.googleClientId) {
    console.warn('Google Client IDs not configured in app.json');
    return null;
  }
  return extra.googleClientId;
};

// Configure Google Sign-In (call once at app startup)
export function configureGoogleSignIn() {
  const clientIds = getClientIds();

  GoogleSignin.configure({
    webClientId: clientIds?.web, // Required for getting accessToken
    offlineAccess: true, // Required for refresh tokens
    scopes: [
      'https://www.googleapis.com/auth/drive.file',
    ],
  });

  console.log('Google Sign-In configured');
}

export interface GoogleAuthResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  email?: string;
  name?: string;
  error?: string;
}

export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  try {
    // Check if Play Services are available
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Sign in
    const response = await GoogleSignin.signIn();

    if (response.type === 'success' && response.data) {
      // Get tokens
      const tokens = await GoogleSignin.getTokens();

      return {
        success: true,
        accessToken: tokens.accessToken,
        email: response.data.user.email,
        name: response.data.user.name || undefined,
      };
    } else if (response.type === 'cancelled') {
      return {
        success: false,
        error: 'Sign in was cancelled',
      };
    } else {
      return {
        success: false,
        error: 'Sign in failed',
      };
    }
  } catch (error: any) {
    console.error('Google Sign-In error:', error);

    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return { success: false, error: 'Sign in was cancelled' };
    } else if (error.code === statusCodes.IN_PROGRESS) {
      return { success: false, error: 'Sign in already in progress' };
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { success: false, error: 'Play Services not available' };
    } else {
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }
}

export async function signOutGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.error('Sign out error:', error);
  }
}

export async function isSignedIn(): Promise<boolean> {
  return await GoogleSignin.hasPreviousSignIn();
}

export async function getCurrentUser() {
  try {
    const user = await GoogleSignin.getCurrentUser();
    return user;
  } catch (error) {
    return null;
  }
}

export async function getTokens() {
  try {
    const tokens = await GoogleSignin.getTokens();
    return tokens;
  } catch (error) {
    console.error('Get tokens error:', error);
    return null;
  }
}
