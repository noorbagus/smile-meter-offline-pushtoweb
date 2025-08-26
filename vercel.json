// src/hooks/useOAuth.ts - Handle callback dari serverless function
import { useState, useEffect, useCallback } from 'react';

export interface OAuthUser {
  displayName: string;
  externalId: string;
  bitmoji?: {
    avatarId: string;
    avatarUrl: string;
  };
}

export interface OAuthState {
  isLoggedIn: boolean;
  accessToken: string | null;
  user: OAuthUser | null;
  isLoading: boolean;
  error: string | null;
}

export const useOAuth = (addLog: (message: string) => void) => {
  const [state, setState] = useState<OAuthState>({
    isLoggedIn: false,
    accessToken: null,
    user: null,
    isLoading: false,
    error: null
  });

  // Handle OAuth callback dari URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthSuccess = urlParams.get('oauth_success');
    const accessToken = urlParams.get('access_token');
    const userInfoStr = urlParams.get('user_info');
    const error = urlParams.get('error');

    if (error) {
      addLog(`❌ OAuth error: ${error}`);
      setState(prev => ({ ...prev, error, isLoading: false }));
      
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (oauthSuccess && accessToken) {
      try {
        const userInfo = userInfoStr ? JSON.parse(decodeURIComponent(userInfoStr)) : null;
        
        addLog(`✅ OAuth success: ${userInfo?.displayName || 'User'}`);
        
        setState(prev => ({
          ...prev,
          isLoggedIn: true,
          accessToken,
          user: userInfo,
          error: null,
          isLoading: false
        }));

        // Store in localStorage
        localStorage.setItem('snapchat_token', accessToken);
        if (userInfo) {
          localStorage.setItem('snapchat_user', JSON.stringify(userInfo));
        }

        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
        
      } catch (parseError) {
        addLog(`❌ Failed to parse user info: ${parseError}`);
        setState(prev => ({ ...prev, error: 'Invalid user data', isLoading: false }));
      }
    }
  }, [addLog]);

  // Restore from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('snapchat_token');
    const storedUser = localStorage.getItem('snapchat_user');
    
    if (storedToken && !state.isLoggedIn) {
      try {
        const user = storedUser ? JSON.parse(storedUser) : null;
        setState(prev => ({
          ...prev,
          isLoggedIn: true,
          accessToken: storedToken,
          user,
          isLoading: false
        }));
        addLog(`🔄 Restored OAuth session: ${user?.displayName || 'User'}`);
      } catch (error) {
        addLog(`❌ Failed to restore session: ${error}`);
        localStorage.removeItem('snapchat_token');
        localStorage.removeItem('snapchat_user');
      }
    }
  }, [addLog, state.isLoggedIn]);

  const login = useCallback(() => {
    addLog('🔐 Redirecting to Snapchat OAuth...');
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    const clientId = import.meta.env.VITE_SNAPCHAT_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/auth/login`;
    
    const authUrl = new URL('https://accounts.snapchat.com/accounts/oauth2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', [
      'user.display_name',
      'user.bitmoji.avatar',
      'user.external_id',
      'https://auth.snapchat.com/oauth2/api/camkit_lens_push_to_device'
    ].join(' '));
    authUrl.searchParams.set('state', btoa(Math.random().toString()).substring(0, 12));
    
    window.location.href = authUrl.toString();
  }, [addLog]);

  const logout = useCallback(() => {
    addLog('👋 Logging out...');
    
    setState({
      isLoggedIn: false,
      accessToken: null,
      user: null,
      isLoading: false,
      error: null
    });
    
    localStorage.removeItem('snapchat_token');
    localStorage.removeItem('snapchat_user');
  }, [addLog]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    login,
    logout,
    clearError
  };
};