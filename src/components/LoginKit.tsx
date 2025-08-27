// src/components/LoginKit.tsx - Complete implementation with debugging
import React, { useEffect, useState, useRef } from 'react';

interface LoginKitProps {
  onLogin: (accessToken: string, userInfo?: any) => void;
  onError?: (error: string) => void;
  addLog?: (message: string) => void;
}

declare global {
  interface Window {
    snapKitInit?: () => void;
    snap?: {
      loginkit: {
        mountButton: (elementId: string, config: any) => void;
        fetchUserInfo: () => Promise<any>;
      };
    };
  }
}

export const LoginKit: React.FC<LoginKitProps> = ({ onLogin, onError, addLog }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [buttonMounted, setButtonMounted] = useState(false);
  const mounted = useRef(false);

  const clientId = import.meta.env.VITE_SNAPCHAT_CLIENT_ID;
  const redirectURI = import.meta.env.VITE_SNAPCHAT_REDIRECT_URI;

  // Debug environment variables
  useEffect(() => {
    addLog?.(`Client ID: ${clientId ? 'SET' : 'MISSING'}`);
    addLog?.(`Redirect URI: ${redirectURI ? 'SET' : 'MISSING'}`);
  }, [clientId, redirectURI, addLog]);

  // Load Snapchat SDK
  useEffect(() => {
    if (window.snap?.loginkit) {
      addLog?.('SDK already loaded');
      setSdkReady(true);
      return;
    }

    addLog?.('Loading Snapchat SDK...');

    window.snapKitInit = () => {
      addLog?.('SDK loaded via snapKitInit callback');
      setSdkReady(true);
    };

    const script = document.createElement('script');
    script.src = 'https://sdk.snapkit.com/js/v1/login.js';
    script.onload = () => {
      addLog?.('SDK script loaded');
      // Fallback if snapKitInit not called
      setTimeout(() => {
        if (window.snap?.loginkit && !sdkReady) {
          addLog?.('SDK ready via fallback');
          setSdkReady(true);
        }
      }, 1000);
    };
    script.onerror = () => {
      addLog?.('SDK script failed to load');
      setError('Failed to load Snapchat SDK');
    };
    document.head.appendChild(script);

    return () => script.remove();
  }, [addLog, sdkReady]);

  // Mount login button when SDK ready
  useEffect(() => {
    if (sdkReady && !mounted.current) {
      mounted.current = true;
      addLog?.('Attempting to mount login button...');
      mountLoginButton();
    }
  }, [sdkReady, addLog]);

  const mountLoginButton = () => {
    if (!window.snap?.loginkit) {
      addLog?.('SDK not available for mounting');
      setError('SDK not available');
      return;
    }

    if (!clientId) {
      addLog?.('Missing VITE_SNAPCHAT_CLIENT_ID');
      setError('Missing Client ID');
      return;
    }

    if (!redirectURI) {
      addLog?.('Missing VITE_SNAPCHAT_REDIRECT_URI');
      setError('Missing Redirect URI');
      return;
    }

    try {
      addLog?.('Mounting button with config...');
      addLog?.(`Client ID: ${clientId.substring(0, 10)}...`);
      addLog?.(`Redirect URI: ${redirectURI}`);

      window.snap.loginkit.mountButton('snap-login-button', {
        clientId,
        redirectURI,
        scopeList: [
          'user.display_name',
          'user.external_id',
          'user.bitmoji.avatar',
          'camkit_lens_push_to_device'
        ],
        handleResponseCallback: handleLoginCallback
      });

      setButtonMounted(true);
      addLog?.('Login button mounted successfully');

    } catch (err: any) {
      const message = err?.message || JSON.stringify(err) || 'Mount failed';
      addLog?.(`Mount error: ${message}`);
      setError(message);
    }
  };

  const handleLoginCallback = async () => {
    addLog?.('Login callback triggered');
    setIsLoading(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      addLog?.('Calling fetchUserInfo...');
      const result = await window.snap!.loginkit.fetchUserInfo();
      addLog?.(`fetchUserInfo result: ${JSON.stringify(result)}`);

      const userInfo = result?.data?.me;
      if (!userInfo) {
        throw new Error('No user information received');
      }

      addLog?.(`Login successful: ${userInfo.displayName}`);
      const token = `push2web_${userInfo.externalId}_${Date.now()}`;
      onLogin(token, userInfo);

    } catch (err: any) {
      let errorMessage = 'Login failed';
      
      if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === 'object') {
        errorMessage = JSON.stringify(err);
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      addLog?.(`Login error: ${errorMessage}`);
      setError(errorMessage);
      onError?.(errorMessage);

    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  // Force show login button for testing
  const showTestButton = () => {
    return (
      <button
        onClick={() => {
          addLog?.('Test login triggered');
          const mockUser = {
            displayName: 'Test User',
            externalId: 'test123'
          };
          onLogin(`test_token_${Date.now()}`, mockUser);
        }}
        className="w-full p-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white text-sm font-medium"
      >
        Test Login (Development)
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Login Button Container */}
      <div id="snap-login-button" className="min-h-[44px]">
        {!sdkReady && (
          <div className="flex items-center justify-center p-4 bg-gray-700 rounded-lg">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            <span className="text-white text-sm">Loading Snapchat SDK...</span>
          </div>
        )}

        {sdkReady && !buttonMounted && !error && (
          <div className="flex items-center justify-center p-4 bg-blue-600 rounded-lg">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            <span className="text-white text-sm">Preparing login...</span>
          </div>
        )}

        {/* Show test button if real button fails */}
        {sdkReady && error && process.env.NODE_ENV === 'development' && (
          <div className="space-y-2">
            <div className="text-red-400 text-xs text-center">SDK Error - Using Test Button</div>
            {showTestButton()}
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
          <div className="flex items-center text-blue-300">
            <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin mr-2" />
            <span className="text-sm">Authenticating with Snapchat...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-500/20 rounded-lg border border-red-500/30">
          <div className="text-red-300 text-sm font-medium mb-2">Login Error</div>
          <div className="text-red-400 text-xs mb-3">{error}</div>
          <button
            onClick={clearError}
            className="text-xs text-red-300 hover:text-red-200 underline mr-4"
          >
            Try again
          </button>
          {process.env.NODE_ENV === 'development' && (
            <button
              onClick={() => {
                clearError();
                setButtonMounted(false);
                mounted.current = false;
                setTimeout(mountLoginButton, 1000);
              }}
              className="text-xs text-yellow-300 hover:text-yellow-200 underline"
            >
              Remount
            </button>
          )}
        </div>
      )}

      {/* Debug Information */}
      <div className="text-xs text-white/60 space-y-1">
        <div className="flex justify-between">
          <span>Client ID:</span>
          <span className={clientId ? 'text-green-400' : 'text-red-400'}>
            {clientId ? 'SET' : 'MISSING'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Redirect URI:</span>
          <span className={redirectURI ? 'text-green-400' : 'text-red-400'}>
            {redirectURI ? 'SET' : 'MISSING'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>SDK Status:</span>
          <span className={sdkReady ? 'text-green-400' : 'text-yellow-400'}>
            {sdkReady ? 'Ready' : 'Loading'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Button Status:</span>
          <span className={buttonMounted ? 'text-green-400' : 'text-yellow-400'}>
            {buttonMounted ? 'Mounted' : 'Waiting'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Push2Web:</span>
          <span className={buttonMounted ? 'text-blue-400' : 'text-gray-400'}>
            {buttonMounted ? 'Enabled' : 'Waiting'}
          </span>
        </div>
      </div>

      {/* Instructions */}
      {buttonMounted && !error && (
        <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <div className="text-blue-300 text-xs font-medium mb-1">
            Push2Web Ready
          </div>
          <div className="text-blue-400 text-xs leading-relaxed">
            After login, you can receive lenses directly from Lens Studio using the same Snapchat account.
          </div>
        </div>
      )}

      {/* Environment Variables Help */}
      {(!clientId || !redirectURI) && (
        <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
          <div className="text-orange-300 text-xs font-medium mb-1">
            Configuration Required
          </div>
          <div className="text-orange-400 text-xs leading-relaxed">
            Set VITE_SNAPCHAT_CLIENT_ID and VITE_SNAPCHAT_REDIRECT_URI in your .env file.
          </div>
        </div>
      )}
    </div>
  );
};