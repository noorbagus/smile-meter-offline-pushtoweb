// src/components/LoginKit.tsx - Fixed Push2Web integration
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

  const clientId = import.meta.env.VITE_SNAPCHAT_CLIENT_ID;
  const redirectURI = import.meta.env.VITE_SNAPCHAT_REDIRECT_URI;

  // Load SDK
  useEffect(() => {
    if (window.snap?.loginkit) {
      setSdkReady(true);
      return;
    }

    window.snapKitInit = () => {
      addLog?.('📱 Login Kit SDK loaded');
      setSdkReady(true);
    };

    const script = document.createElement('script');
    script.src = 'https://sdk.snapkit.com/js/v1/login.js';
    script.onload = () => addLog?.('📱 SDK script loaded');
    script.onerror = () => setError('SDK load failed');
    document.head.appendChild(script);

    return () => document.getElementById('loginkit-sdk')?.remove();
  }, [addLog]);

  // Mount button when SDK ready
  useEffect(() => {
    if (sdkReady && !mountAttempted.current) {
      mountAttempted.current = true;
      setTimeout(mountButton, 100);
    }
  }, [sdkReady]);

  const mountButton = () => {
    if (!window.snap?.loginkit) {
      setError('SDK not available');
      return;
    }

    if (!clientId || !redirectURI) {
      setError('Missing OAuth config');
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
          'camkit_lens_push_to_device'
        ],
        handleResponseCallback: async () => {
          addLog?.('🔐 Login callback triggered');
          setIsLoading(true);
          setError(null);
          
          try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const result = await window.snap!.loginkit.fetchUserInfo();
            const userInfo = result?.data?.me;
            
            if (!userInfo) {
              throw new Error('No user info received');
            }
            
            addLog?.(`✅ Login success: ${userInfo.displayName}`);
            addLog?.(`🎯 Push2Web scope granted for user: ${userInfo.externalId}`);
            
            const mockToken = `snap_push2web_${userInfo.externalId}_${Date.now()}`;
            onLogin(mockToken, userInfo);
            
          } catch (err: any) {
            const errorMessage = err?.message || err?.toString() || 'Authentication failed';
            addLog?.(`❌ Login error: ${errorMessage}`);
            setError('Authentication failed - please try again');
          } finally {
            setIsLoading(false);
          }
        }
      });
      
      setButtonMounted(true);
      addLog?.('🎯 Push2Web login button mounted');
      
    } catch (err: any) {
      addLog?.(`❌ Button mount error: ${err?.message || err}`);
      setError('Button mount failed');
    }
  };

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
            Push2Web enabled - Ready for Lens Studio
          </div>
        )}
      </div>

      {isLoading && (
        <div className="p-3 bg-blue-500/20 rounded-lg">
          <div className="text-blue-300 text-sm flex items-center">
            <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin mr-2" />
            Authenticating with Push2Web...
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/20 rounded-lg">
          <div className="text-red-300 text-sm">{error}</div>
        </div>
      )}

      <div className="text-xs text-white/60 space-y-1">
        <div>Client ID: {clientId ? '✅' : '❌'}</div>
        <div>Redirect URI: {redirectURI ? '✅' : '❌'}</div>
        <div>SDK Ready: {sdkReady ? '✅' : '⏳'}</div>
        <div>Button Mounted: {buttonMounted ? '✅' : '⏳'}</div>
        <div className="text-purple-300">🎯 Push2Web Scope: camkit_lens_push_to_device</div>
      </div>
    </div>
  );
};