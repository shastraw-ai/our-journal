import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

// Get client IDs from app config
const getClientIds = () => {
  const extra = Constants.expoConfig?.extra;
  if (!extra?.googleClientId) {
    console.warn('Google Client IDs not configured in app.json');
    return null;
  }
  return extra.googleClientId;
};

export interface GoogleAuthResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  email?: string;
  name?: string;
  error?: string;
}

export function useGoogleAuth() {
  const clientIds = getClientIds();

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: clientIds?.android,
    iosClientId: clientIds?.ios,
    webClientId: clientIds?.web,
    scopes: [
      'openid',
      'profile',
      'email',
      'https://www.googleapis.com/auth/drive.file',
    ],
  });

  // Debug logging
  console.log('=== Google Auth Debug ===');
  console.log('Request ready:', !!request);
  console.log('Redirect URI:', request?.redirectUri);
  console.log('Client ID:', request?.clientId);
  console.log('Response type:', response?.type);
  if (response?.type === 'success') {
    console.log('Auth success! Token:', response.authentication?.accessToken?.substring(0, 20) + '...');
  }
  console.log('=========================');

  return { request, response, promptAsync };
}

export async function getUserInfo(accessToken: string): Promise<{ email?: string; name?: string }> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error('Failed to get user info');
    }
    const data = await response.json();
    return { email: data.email, name: data.name };
  } catch (error) {
    console.error('Error getting user info:', error);
    return {};
  }
}

// Legacy function for backwards compatibility
export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  return {
    success: false,
    error: 'Please use the useGoogleAuth hook instead',
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleAuthResult> {
  try {
    const clientIds = getClientIds();
    if (!clientIds) {
      return { success: false, error: 'Client ID not configured' };
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientIds.web,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to refresh token' };
    }

    const data = await response.json();

    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
    };
  } catch (error) {
    console.error('Token refresh error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
