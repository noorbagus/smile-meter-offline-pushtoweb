// src/components/Push2WebManager.tsx - Complete Push2Web with OAuth integration
import React, { useEffect, useCallback } from 'react';
import { usePush2Web, useOAuth } from '../hooks';
import { LoginKit } from './LoginKit';
import type { LensReceivedData } from '../hooks/usePush2Web';

interface Push2WebManagerProps {
  onLensReceived?: (lensData: LensReceivedData) => void;
  cameraKitSession?: any;
  lensRepository?: any;
  addLog: (message: string) => void;
}

export const Push2WebManager: React.FC<Push2WebManagerProps> = ({ 
  onLensReceived,
  cameraKitSession,
  lensRepository,
  addLog
}) => {
  // OAuth hook
  const {
    isAuthenticated,
    accessToken,
    user,
    isLoading: oauthLoading,
    error: oauthError,
    loginViaPopup,
    logout,
    clearError: clearOAuthError,
    canLogin
  } = useOAuth(addLog);

  // Push2Web hook with event handlers
  const {
    status,
    connectionState,
    lastLensReceived,
    isReady,
    subscribe,
    unsubscribe,
    reconnect,
    clearError: clearPush2WebError,
    getStatusSummary
  } = usePush2Web(addLog, {
    onLensReceived: (data: LensReceivedData) => {
      addLog(`🎬 Lens applied: ${data.name}`);
      onLensReceived?.(data);
    },
    onError: (error: string) => {
      addLog(`❌ Push2Web error: ${error}`);
    },
    onSubscriptionChanged: (state: any) => {
      addLog(`🔄 Connection: ${state}`);
    }
  });

  // Auto-subscribe when authenticated and Camera Kit ready
  useEffect(() => {
    if (isAuthenticated && accessToken && cameraKitSession && lensRepository && !status.subscribed) {
      addLog('🚀 Auto-subscribing to Push2Web...');
      subscribe(accessToken, cameraKitSession, lensRepository);
    }
  }, [isAuthenticated, accessToken, cameraKitSession, lensRepository, status.subscribed, subscribe, addLog]);

  // Handle manual login
  const handleLogin = useCallback((token: string, userInfo?: any) => {
    addLog(`✅ OAuth success: ${userInfo?.displayName || 'User'}`);
    
    // Auto-subscribe if Camera Kit is ready
    if (cameraKitSession && lensRepository) {
      setTimeout(() => {
        subscribe(token, cameraKitSession, lensRepository);
      }, 500);
    }
  }, [cameraKitSession, lensRepository, subscribe, addLog]);

  // Handle logout
  const handleLogout = useCallback(() => {
    unsubscribe();
    logout();
    addLog('👋 Logged out and disconnected from Push2Web');
  }, [unsubscribe, logout, addLog]);

  // Handle retry connection
  const handleRetryConnection = useCallback(() => {
    if (accessToken && cameraKitSession && lensRepository) {
      reconnect(accessToken, cameraKitSession, lensRepository);
    }
  }, [accessToken, cameraKitSession, lensRepository, reconnect]);

  const statusSummary = getStatusSummary();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-black/20 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <span>🎯</span>
          Push2Web Status
        </h3>
        
        {/* Status Grid */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-white/70">OAuth:</span>
            <span className={isAuthenticated ? 'text-green-400' : 'text-red-400'}>
              {isAuthenticated ? '✅ Connected' : '❌ Not logged in'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-white/70">Push2Web:</span>
            <span className={status.available ? 'text-green-400' : 'text-red-400'}>
              {status.available ? '✅ Ready' : '❌ Not ready'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-white/70">Subscription:</span>
            <span className={status.subscribed ? 'text-green-400' : 'text-orange-400'}>
              {status.subscribed ? '✅ Active' : '⏳ Waiting'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-white/70">Connection:</span>
            <span className={
              connectionState === 'connected' ? 'text-green-400' : 
              connectionState === 'connecting' ? 'text-orange-400' : 
              'text-red-400'
            }>
              {connectionState === 'connected' ? '✅ Live' : 
               connectionState === 'connecting' ? '🔄 Connecting' : 
               '❌ Offline'}
            </span>
          </div>
        </div>

        {/* User Info */}
        {isAuthenticated && user && (
          <div className="mt-3 p-2 bg-green-500/10 rounded text-sm">
            <div className="flex items-center gap-2">
              {user.bitmoji?.avatarUrl && (
                <img 
                  src={user.bitmoji.avatarUrl} 
                  alt="Avatar" 
                  className="w-6 h-6 rounded-full"
                />
              )}
              <span className="text-green-300 font-medium">{user.displayName}</span>
            </div>
            <div className="text-xs text-green-400 mt-1">
              Ready to receive lenses from Lens Studio
            </div>
          </div>
        )}

        {/* Last Lens Received */}
        {lastLensReceived && (
          <div className="mt-3 p-2 bg-purple-500/10 rounded text-sm">
            <div className="text-purple-300 font-medium">📸 Last Lens:</div>
            <div className="text-xs text-purple-400">
              {lastLensReceived.name} • {lastLensReceived.cameraFacingPreference}
            </div>
          </div>
        )}
      </div>

      {/* Authentication Section */}
      {!isAuthenticated ? (
        <div className="space-y-3">
          <div className="text-white/80 text-sm">
            <p className="mb-2">🔐 Login required to receive lenses from Lens Studio</p>
            <p className="text-xs text-white/60">
              Use the same Snapchat account in both this app and Lens Studio
            </p>
          </div>
          
          {/* Login Component */}
          <LoginKit
            onLogin={handleLogin}
            onError={(error) => addLog(`❌ Login error: ${error}`)}
            addLog={addLog}
          />
          
          {/* Alternative popup login */}
          {canLogin && (
            <button
              onClick={loginViaPopup}
              disabled={oauthLoading}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {oauthLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <span>🪟</span>
                  <span>Alternative Login (Popup)</span>
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Connection Actions */}
          {!isReady && isAuthenticated && (
            <div className="space-y-2">
              <button
                onClick={handleRetryConnection}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
              >
                🔄 Retry Connection
              </button>
              
              <div className="text-xs text-white/60 bg-orange-500/10 p-3 rounded">
                💡 Make sure Camera Kit is fully initialized before connecting
              </div>
            </div>
          )}
          
          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
          >
            👋 Logout & Disconnect
          </button>
        </div>
      )}

      {/* Error Display */}
      {(oauthError || status.error) && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
          <div className="text-red-300 text-sm font-medium">Error</div>
          <div className="text-red-400 text-xs mt-1">
            {oauthError || status.error}
          </div>
          <div className="flex gap-2 mt-2">
            {oauthError && (
              <button
                onClick={clearOAuthError}
                className="text-xs text-red-300 hover:text-red-200"
              >
                Clear OAuth Error
              </button>
            )}
            {status.error && (
              <button
                onClick={clearPush2WebError}
                className="text-xs text-red-300 hover:text-red-200"
              >
                Clear Push2Web Error
              </button>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="text-xs text-white/60 space-y-2">
        <div className="bg-blue-500/10 rounded p-3">
          <p className="font-medium text-blue-300 mb-1">🎯 How to use Push2Web:</p>
          <ol className="space-y-1 pl-4 list-decimal">
            <li>Login with your Snapchat account</li>
            <li>Wait for "Live" connection status</li>
            <li>Open Lens Studio with the same account</li>
            <li>Click "Send to Camera Kit" in Lens Studio</li>
            <li>Lens will appear automatically in this app!</li>
          </ol>
        </div>
        
        {import.meta.env.DEV && (
          <div className="bg-orange-500/10 rounded p-3">
            <p className="font-medium text-orange-300 mb-1">🔧 Development Notes:</p>
            <ul className="space-y-1 pl-4 text-xs">
              <li>• Only staging OAuth tokens supported</li>
              <li>• Same account required in Lens Studio</li>
              <li>• Account must be in Demo Users list</li>
              <li>• Real-time lens push from Lens Studio</li>
            </ul>
          </div>
        )}
      </div>

      {/* Debug Status */}
      {import.meta.env.DEV && (
        <details className="text-xs">
          <summary className="text-white/50 cursor-pointer hover:text-white/70">
            Debug Status
          </summary>
          <div className="mt-2 p-3 bg-black/50 rounded font-mono text-white/60">
            <pre>{JSON.stringify(statusSummary, null, 2)}</pre>
          </div>
        </details>
      )}
    </div>
  );
};