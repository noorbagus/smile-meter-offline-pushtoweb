// src/hooks/useOAuth.ts
import { useState, useCallback, useEffect } from 'react';

export interface OAuthUser {
  id: string;
  displayName: string;
  externalId: string;
  bitmoji?: {
    avatarId: string;
    avatarUrl: string;
  };
}

export interface OAuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  user: OAuthUser | null;
  isLoading: boolean;
  error: string | null;
}

declare global {
  interface Window {
    snapKitInit?: () => void;
    snap?: {
      loginkit: {
        mountButton: (elementId: string, config: any) => void;
        fetchUserInfo: () => Promise<{ data: { me: OAuthUser } }>;
      };
    };
  }
}

export const useOAuth = (addLog: (message: string) => void) => {
  const [state, setState] = useState<OAuthState>({
    isAuthenticated: false,
    accessToken: null,
    user: null,
    isLoading: false,
    error: null
  });

  const [sdkReady, setSdkReady] = useState(false);

  // Load Snapchat SDK
  useEffect(() => {
    if (window.snap?.loginkit) {
      setSdkReady(true);
      return;
    }

    window.snapKitInit = () => {
      addLog('🔑 Snapchat SDK loaded');
      setSdkReady(true);
    };

    const script = document.createElement('script');
    script.src = 'https://sdk.snapkit.com/js/v1/login.js';
    script.onload = () => addLog('📱 SDK script loaded');
    script.onerror = () => {
      setState(prev => ({ ...prev, error: 'Failed to load Snapchat SDK' }));
      addLog('❌ SDK load failed');
    };
    document.head.appendChild(script);

    return () => {
      const existingScript = document.getElementById('loginkit-sdk');
      existingScript?.remove();
    };
  }, [addLog]);

  // Check for existing session
  useEffect(() => {
    const savedToken = sessionStorage.getItem('snap_oauth_token');
    const savedUser = sessionStorage.getItem('snap_oauth_user');

    if (savedToken && savedUser) {
      try {
        setState({
          isAuthenticated: true,
          accessToken: savedToken,
          user: JSON.parse(savedUser),
          isLoading: false,
          error: null
        });
        addLog('🔄 Restored OAuth session');
      } catch (error) {
        addLog('⚠️ Failed to restore session');
        sessionStorage.removeItem('snap_oauth_token');
        sessionStorage.removeItem('snap_oauth_user');
      }
    }
  }, [addLog]);

  // Login via popup
  const loginViaPopup = useCallback(() => {
    const clientId = import.meta.env.VITE_SNAPCHAT_CLIENT_ID;
    const redirectURI = import.meta.env.VITE_SNAPCHAT_REDIRECT_URI;

    if (!clientId || !redirectURI) {
      setState(prev => ({ ...prev, error: 'Missing OAuth configuration' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const state = btoa(Math.random().toString()).substring(0, 12);
    sessionStorage.setItem('snapchat_oauth_state', state);

    const scopes = [
      'https://auth.snapchat.com/oauth2/api/user.display_name',
      'https://auth.snapchat.com/oauth2/api/user.external_id',
      'https://auth.snapchat.com/oauth2/api/user.bitmoji.avatar',
      'https://auth.snapchat.com/oauth2/api/camkit_lens_push_to_device'
    ].join('%20');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectURI,
      response_type: 'token',
      scope: scopes,
      state: state
    });

    const authUrl = `https://accounts.snapchat.com/accounts/oauth2/auth?${params}`;
    
    addLog('🔐 Opening OAuth popup...');
    
    const popup = window.open(
      authUrl,
      'snapchat-oauth',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    if (!popup) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Popup blocked' 
      }));
      return;
    }

    // Listen for popup messages
    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'SNAPCHAT_OAUTH_SUCCESS') {
        window.removeEventListener('message', messageHandler);
        popup.close();
        
        const { access_token, user_info } = event.data;
        
        if (user_info) {
          const user: OAuthUser = {
            id: user_info.id,
            displayName: user_info.displayName,
            externalId: user_info.externalId,
            bitmoji: user_info.bitmoji
          };

          sessionStorage.setItem('snap_oauth_token', access_token);
          sessionStorage.setItem('snap_oauth_user', JSON.stringify(user));

          setState({
            isAuthenticated: true,
            accessToken: access_token,
            user,
            isLoading: false,
            error: null
          });

          addLog(`✅ Popup login successful: ${user.displayName}`);
        } else {
          setState({
            isAuthenticated: true,
            accessToken: access_token,
            user: null,
            isLoading: false,
            error: null
          });

          addLog('✅ Popup login successful (token only)');
        }

      } else if (event.data.type === 'SNAPCHAT_OAUTH_ERROR') {
        window.removeEventListener('message', messageHandler);
        popup.close();
        
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: event.data.error 
        }));
        addLog(`❌ OAuth error: ${event.data.error}`);
      }
    };

    window.addEventListener('message', messageHandler);

    // Check if popup closed manually
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: 'Login cancelled' 
        }));
        addLog('⚠️ Login cancelled by user');
      }
    }, 1000);

  }, [addLog]);

  // Logout
  const logout = useCallback(() => {
    setState({
      isAuthenticated: false,
      accessToken: null,
      user: null,
      isLoading: false,
      error: null
    });

    sessionStorage.removeItem('snap_oauth_token');
    sessionStorage.removeItem('snap_oauth_user');
    
    addLog('👋 Logged out');
  }, [addLog]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    ...state,
    sdkReady,

    // Actions
    loginViaPopup,
    logout,
    clearError,

    // Computed
    canLogin: sdkReady && !state.isLoading,
    hasValidToken: state.isAuthenticated && !!state.accessToken
  };
};