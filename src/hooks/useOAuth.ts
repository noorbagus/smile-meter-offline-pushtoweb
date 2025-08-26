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

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthSuccess = urlParams.get('oauth_success');
    const accessToken = urlParams.get('access_token');
    const userInfoStr = urlParams.get('user_info');
    const error = urlParams.get('error');

    if (error) {
      addLog(`❌ OAuth error: ${error}`);
      setState(prev => ({ ...prev, error, isLoading: false }));
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

        sessionStorage.setItem('oauth_token', accessToken);
        if (userInfo) {
          sessionStorage.setItem('oauth_user', JSON.stringify(userInfo));
        }

        window.history.replaceState({}, '', window.location.pathname);
        
      } catch (parseError) {
        addLog(`❌ Failed to parse user info: ${parseError}`);
        setState(prev => ({ ...prev, error: 'Invalid user data', isLoading: false }));
      }
    }
  }, [addLog]);

  useEffect(() => {
    const storedToken = sessionStorage.getItem('oauth_token');
    const storedUser = sessionStorage.getItem('oauth_user');
    
    if (storedToken) {
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
        sessionStorage.removeItem('oauth_token');
        sessionStorage.removeItem('oauth_user');
      }
    }
  }, [addLog]);

  const login = useCallback(() => {
    addLog('🔐 Redirecting to Snapchat OAuth...');
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    window.location.href = '/api/auth/login';
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
    
    sessionStorage.removeItem('oauth_token');
    sessionStorage.removeItem('oauth_user');
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