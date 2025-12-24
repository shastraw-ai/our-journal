import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

// Get client IDs from app config
const getClientId = () => {
  const extra = Constants.expoConfig?.extra;
  if (!extra?.googleClientId) {
    console.warn('Google Client IDs not configured in app.json');
    return null;
  }
  return extra.googleClientId;
};

// Discovery document for Google OAuth
const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

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
    const clientIds = getClientId();

    if (!clientIds || clientIds.web === 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com') {
      return {
        success: false,
        error: 'Google OAuth not configured. Please set up Google Cloud credentials.',
      };
    }

    // Create the auth request
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'ourjournal',
    });

    const request = new AuthSession.AuthRequest({
      clientId: clientIds.web,
      scopes: [
        'openid',
        'profile',
        'email',
        'https://www.googleapis.com/auth/drive.file',
      ],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    });

    // Prompt the user to sign in
    const result = await request.promptAsync(discovery);

    if (result.type === 'success' && result.params.code) {
      // Exchange code for tokens
      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          clientId: clientIds.web,
          code: result.params.code,
          redirectUri,
          extraParams: {
            code_verifier: request.codeVerifier!,
          },
        },
        discovery
      );

      // Get user info
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${tokenResult.accessToken}`,
          },
        }
      );

      if (!userInfoResponse.ok) {
        return {
          success: false,
          error: 'Failed to get user information',
        };
      }

      const userInfo = await userInfoResponse.json();

      return {
        success: true,
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken || undefined,
        email: userInfo.email,
        name: userInfo.name,
      };
    } else if (result.type === 'cancel') {
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
  } catch (error) {
    console.error('Google sign in error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleAuthResult> {
  try {
    const clientIds = getClientId();
    if (!clientIds) {
      return { success: false, error: 'Client ID not configured' };
    }

    const response = await fetch(discovery.tokenEndpoint, {
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
