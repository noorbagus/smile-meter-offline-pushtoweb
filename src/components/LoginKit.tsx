// src/components/LoginKit.tsx - Clean refactored version
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

  // Load Snapchat SDK
  useEffect(() => {
    if (window.snap?.loginkit) {
      setSdkReady(true);
      return;
    }

    window.snapKitInit = () => {
      addLog?.('📱 Snapchat SDK loaded');
      setSdkReady(true);
    };

    const script = document.createElement('script');
    script.src = 'https://sdk.snapkit.com/js/v1/login.js';
    script.onload = () => addLog?.('📱 SDK script loaded');
    script.onerror = () => setError('Failed to load Snapchat SDK');
    document.head.appendChild(script);

    return () => script.remove();
  }, [addLog]);

  // Mount login button when SDK ready
  useEffect(() => {
    if (sdkReady && !mounted.current) {
      mounted.current = true;
      mountLoginButton();
    }
  }, [sdkReady]);

  const mountLoginButton = () => {
    if (!window.snap?.loginkit) {
      setError('SDK not available');
      return;
    }

    if (!clientId || !redirectURI) {
      setError('Missing OAuth configuration');
      return;
    }

    try {
      addLog?.('🔧 Mounting login button...');

      window.snap.loginkit.mountButton('snap-login-button', {
        clientId,
        redirectURI,
        scopeList: [
          'user.display_name',
          'user.external_id',
          'user.bitmoji.avatar',
          'camkit_lens_push_to_device' // Required for Push2Web
        ],
        handleResponseCallback: handleLoginCallback
      });

      setButtonMounted(true);
      addLog?.('✅ Login button ready');

    } catch (err: any) {
      const message = err?.message || 'Button mount failed';
      addLog?.(`❌ Mount error: ${message}`);
      setError(message);
    }
  };

  const handleLoginCallback = async () => {
    addLog?.('🔐 Processing login...');
    setIsLoading(true);
    setError(null);

    try {
      // Wait for login process to complete
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const result = await window.snap!.loginkit.fetchUserInfo();
      const userInfo = result?.data?.me;

      if (!userInfo) {
        throw new Error('No user information received');
      }

      addLog?.(`✅ Login successful: ${userInfo.displayName}`);
      addLog?.(`🎯 Push2Web enabled for user: ${userInfo.externalId}`);

      // Generate Push2Web-compatible token
      const token = `push2web_${userInfo.externalId}_${Date.now()}`;
      onLogin(token, userInfo);

    } catch (err: any) {
      let errorMessage = 'Login failed';
      
      // Better error handling
      if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === 'object') {
        errorMessage = JSON.stringify(err);
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      addLog?.(`❌ Login error: ${errorMessage}`);
      setError(errorMessage);
      onError?.(errorMessage);

    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

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
            className="text-xs text-red-300 hover:text-red-200 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Configuration Status */}
      <div className="text-xs text-white/60 space-y-1">
        <div className="flex justify-between">
          <span>Client ID:</span>
          <span className={clientId ? 'text-green-400' : 'text-red-400'}>
            {clientId ? '✅' : '❌'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Redirect URI:</span>
          <span className={redirectURI ? 'text-green-400' : 'text-red-400'}>
            {redirectURI ? '✅' : '❌'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>SDK Status:</span>
          <span className={sdkReady ? 'text-green-400' : 'text-yellow-400'}>
            {sdkReady ? '✅ Ready' : '⏳ Loading'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Button Status:</span>
          <span className={buttonMounted ? 'text-green-400' : 'text-yellow-400'}>
            {buttonMounted ? '✅ Mounted' : '⏳ Waiting'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Push2Web:</span>
          <span className={buttonMounted ? 'text-blue-400' : 'text-gray-400'}>
            {buttonMounted ? '🎯 Enabled' : '⏳ Waiting'}
          </span>
        </div>
      </div>

      {/* Instructions */}
      {buttonMounted && !error && (
        <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <div className="text-blue-300 text-xs font-medium mb-1">
            🎯 Push2Web Ready
          </div>
          <div className="text-blue-400 text-xs leading-relaxed">
            After login, you can receive lenses directly from Lens Studio using the same Snapchat account.
          </div>
        </div>
      )}
    </div>
  );
};