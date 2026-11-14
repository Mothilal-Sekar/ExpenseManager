import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

// Google OAuth 2.0 endpoints
const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_USER_INFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';

export const GOOGLE_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

export interface GoogleUserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verifiedEmail: boolean;
}

export interface GoogleAuthResult {
  success: boolean;
  accessToken?: string;
  expiresIn?: number;
  profile?: GoogleUserProfile;
  error?: string;
}

/**
 * Initiates Google OAuth2 sign-in using expo-auth-session / WebBrowser.
 */
export async function promptGoogleSignIn(
  clientId?: string
): Promise<GoogleAuthResult> {
  try {
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'expensemanager',
      preferLocalhost: true,
    });

    const activeClientId =
      clientId?.trim() ||
      // Default Expo web/generic client ID placeholder
      '684128526549-placeholder.apps.googleusercontent.com';

    // Construct OAuth URL
    const authUrl = `${GOOGLE_AUTH_ENDPOINT}?${new URLSearchParams({
      client_id: activeClientId,
      redirect_uri: redirectUri,
      response_type: 'token',
      scope: GOOGLE_SCOPES.join(' '),
      prompt: 'consent',
      access_type: 'online',
    }).toString()}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

    if (result.type === 'success' && result.url) {
      // Parse access_token from redirect URL fragment (#access_token=...&expires_in=...)
      const fragment = result.url.split('#')[1] || result.url.split('?')[1] || '';
      const params = new URLSearchParams(fragment);
      const accessToken = params.get('access_token');
      const expiresIn = parseInt(params.get('expires_in') || '3600', 10);

      if (accessToken) {
        // Fetch user profile using the access token
        const profile = await fetchGoogleUserProfile(accessToken);
        return {
          success: true,
          accessToken,
          expiresIn,
          profile: profile || undefined,
        };
      }
    }

    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { success: false, error: 'Sign-in was cancelled by user' };
    }

    return { success: false, error: 'Unable to acquire token from response' };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    return {
      success: false,
      error: error?.message || 'Failed to authenticate with Google',
    };
  }
}

/**
 * Fetches user profile from Google's userinfo endpoint using OAuth access token.
 */
export async function fetchGoogleUserProfile(
  accessToken: string
): Promise<GoogleUserProfile | null> {
  try {
    const response = await fetch(GOOGLE_USER_INFO_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('Failed to fetch Google profile:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    return {
      id: data.sub || data.id,
      email: data.email,
      name: data.name || data.email?.split('@')[0] || 'Google User',
      picture: data.picture,
      verifiedEmail: Boolean(data.email_verified),
    };
  } catch (error) {
    console.error('Error fetching Google user profile:', error);
    return null;
  }
}

/**
 * Validates whether an access token is expired based on recorded expiry timestamp.
 */
export function isTokenExpired(expiryTimestamp?: number): boolean {
  if (!expiryTimestamp) return true;
  // Consider expired 60 seconds before actual expiry
  return Date.now() >= expiryTimestamp - 60000;
}
