// src/components/LoginKit.tsx - Fixed premature callback execution
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
  const mountAttempted = useRef(false);
  const userInitiated = useRef(false); // Track if user actually clicked

  const clientId = import.meta.env.VITE_SNAPCHAT_CLIENT_ID;
  const redirectURI = import.meta.env.VITE_SNAPCHAT_REDIRECT_URI;

  // Load SDK
  useEffect(() => {
    if (window.snap?.loginkit) {
      setSdkReady(true);
      return;
    }

    window.snapKitInit = () => {
      addLog?.('📱 SDK loaded');
      setSdkReady(true);
    };

    const script = document.createElement('script');
    script.src = 'https://sdk.snapkit.com/js/v1/login.js';
    script.onload = () => addLog?.('📱 SDK script loaded');
    script.onerror = () => {
      setTimeout(() => setError('SDK load failed'), 100);
    };
    document.head.appendChild(script);

    return () => document.getElementById('loginkit-sdk')?.remove();
  }, [addLog]);

  // Mount button when SDK ready
  useEffect(() => {
    if (sdkReady && !mountAttempted.current) {
      mountAttempted.current = true;
      
      // Delay mounting to ensure DOM is ready
      setTimeout(() => {
        mountButton();
      }, 100);
    }
  }, [sdkReady]);

  // Listen for OAuth messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'SNAPCHAT_OAUTH_SUCCESS') {
        addLog?.('📡 OAuth success via postMessage');
        userInitiated.current = true; // Mark as user-initiated
        onLogin(event.data.access_token, event.data.user_info);
        setIsLoading(false);
        setError(null);
      } else if (event.data.type === 'SNAPCHAT_OAUTH_ERROR') {
        addLog?.(`❌ OAuth error: ${event.data.error}`);
        setError(`OAuth error: ${event.data.error}`);
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onLogin, addLog]);

  const mountButton = () => {
    if (!window.snap?.loginkit) {
      setTimeout(() => setError('SDK not available'), 100);
      return;
    }

    if (!clientId || !redirectURI) {
      setTimeout(() => setError('Missing config'), 100);
      return;
    }

    try {
      window.snap.loginkit.mountButton('snap-login-button', {
        clientId,
        redirectURI,
        scopeList: [
          'user.display_name',
          'user.external_id',
          'user.bitmoji.avatar',
          'camkit_lens_push_to_device' // Push2Web scope
        ],
        handleResponseCallback: async () => {
          // CRITICAL FIX: Only process if user actually initiated login
          if (!userInitiated.current) {
            addLog?.('⚠️ Callback triggered without user action - ignoring');
            return;
          }
          
          addLog?.('🔐 Processing user login...');
          setIsLoading(true);
          setError(null);
          
          try {
            // Longer delay for API readiness
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const result = await window.snap!.loginkit.fetchUserInfo();
            const userInfo = result?.data?.me;
            
            if (!userInfo) {
              throw new Error('No user info received');
            }
            
            addLog?.(`✅ Login success: ${userInfo.displayName}`);
            addLog?.(`🎯 Push2Web enabled for: ${userInfo.externalId}`);
            
            const mockToken = `snap_push2web_${userInfo.externalId}_${Date.now()}`;
            onLogin(mockToken, userInfo);
            
          } catch (err: any) {
            const errorMsg = err?.message || err?.toString() || 'Authentication failed';
            addLog?.(`❌ Login error: ${errorMsg}`);
            
            setTimeout(() => {
              setError('Login failed - please try again');
            }, 500);
          } finally {
            setIsLoading(false);
            userInitiated.current = false; // Reset flag
          }
        }
      });
      
      // Add click listener to detect user interaction
      const buttonContainer = document.getElementById('snap-login-button');
      if (buttonContainer) {
        buttonContainer.addEventListener('click', () => {
          addLog?.('👆 User clicked login button');
          userInitiated.current = true;
          setIsLoading(true);
        });
      }
      
      setButtonMounted(true);
      addLog?.('🎯 Push2Web login button mounted');
      
    } catch (err: any) {
      addLog?.(`❌ Mount error: ${err?.message || err}`);
      setTimeout(() => setError('Button mount failed'), 100);
    }
  };

  // Show loading state while SDK loads
  const showLoading = !sdkReady || (sdkReady && !buttonMounted && !error);

  return (
    <div className="space-y-4">
      <div id="snap-login-button" className="min-h-[44px]">
        {showLoading && (
          <div className="p-3 bg-gray-600 rounded-lg text-center">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className="text-white text-sm">Loading Snapchat Login...</span>
          </div>
        )}
        
        {buttonMounted && !error && (
          <div className="text-center text-green-300 text-xs">
            🎯 Push2Web login ready
          </div>
        )}
      </div>

      {isLoading && (
        <div className="p-3 bg-blue-500/20 rounded-lg">
          <div className="text-blue-300 text-sm flex items-center">
            <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin mr-2" />
            Processing login...
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/20 rounded-lg">
          <div className="text-red-300 text-sm">{error}</div>
          <button 
            onClick={() => setError(null)}
            className="mt-2 text-xs text-red-400 hover:text-red-300"
          >
            Try again
          </button>
        </div>
      )}

      <div className="text-xs text-white/60 space-y-1">
        <div>Client ID: {clientId ? '✅' : '❌'}</div>
        <div>Redirect: {redirectURI ? '✅' : '❌'}</div>
        <div>SDK: {sdkReady ? '✅' : '⏳'}</div>
        <div>Button: {buttonMounted ? '✅' : '⏳'}</div>
        <div>Push2Web: {buttonMounted ? '🎯 Ready' : '⏳'}</div>
      </div>
    </div>
  );
};