// src/components/Push2WebManager.tsx - Updated untuk server OAuth
import React, { useEffect, useState } from 'react';
import { useOAuth } from '../hooks/useOAuth';
import { useCameraContext } from '../context/CameraContext';

interface Push2WebManagerProps {
  onLensReceived?: (lensData: any) => void;
}

export const Push2WebManager: React.FC<Push2WebManagerProps> = ({ onLensReceived }) => {
  const { addLog, subscribePush2Web, getPush2WebStatus } = useCameraContext();
  const { 
    isLoggedIn, 
    accessToken, 
    user, 
    isLoading, 
    error, 
    login, 
    logout, 
    clearError 
  } = useOAuth(addLog);
  
  const [push2WebStatus, setPush2WebStatus] = useState({
    available: false,
    subscribed: false,
    session: false,
    repository: false
  });

  // Update Push2Web status
  useEffect(() => {
    const status = getPush2WebStatus();
    setPush2WebStatus(status);
  }, [getPush2WebStatus]);

  // Auto-subscribe when logged in
  useEffect(() => {
    if (isLoggedIn && accessToken && !push2WebStatus.subscribed) {
      const subscribeAsync = async () => {
        try {
          addLog('🔗 Auto-subscribing to Push2Web...');
          const success = await subscribePush2Web(accessToken);
          if (success) {
            addLog('✅ Push2Web subscription successful');
            // Update status
            const newStatus = getPush2WebStatus();
            setPush2WebStatus(newStatus);
          } else {
            addLog('❌ Push2Web subscription failed');
          }
        } catch (error) {
          addLog(`❌ Push2Web subscription error: ${error}`);
        }
      };
      
      // Delay subscription to ensure Camera Kit is ready
      setTimeout(subscribeAsync, 1000);
    }
  }, [isLoggedIn, accessToken, push2WebStatus.subscribed, subscribePush2Web, addLog, getPush2WebStatus]);

  const isPush2WebReady = isLoggedIn && accessToken && push2WebStatus.subscribed;

  return (
    <div className="space-y-4">
      <div className="bg-black/20 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <span>👻</span>
          Push2Web Status
        </h3>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-white/70">Snapchat Login:</span>
            <span className={isLoggedIn ? 'text-green-400' : 'text-red-400'}>
              {isLoggedIn ? '✅ Connected' : '❌ Not connected'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-white/70">Access Token:</span>
            <span className={accessToken ? 'text-green-400' : 'text-red-400'}>
              {accessToken ? '✅ Valid' : '❌ Missing'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-white/70">Push2Web Available:</span>
            <span className={push2WebStatus.available ? 'text-green-400' : 'text-red-400'}>
              {push2WebStatus.available ? '✅ Ready' : '❌ Not available'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-white/70">Subscribed:</span>
            <span className={push2WebStatus.subscribed ? 'text-green-400' : 'text-orange-400'}>
              {push2WebStatus.subscribed ? '✅ Active' : '⏳ Waiting'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-white/70">Overall Status:</span>
            <span className={isPush2WebReady ? 'text-green-400' : 'text-orange-400'}>
              {isPush2WebReady ? '🟢 Ready for Lens Studio' : '🟡 Not ready'}
            </span>
          </div>
        </div>

        {user && (
          <div className="mt-3 p-3 bg-green-500/10 rounded">
            <p className="text-green-300 font-medium text-sm">
              Logged in as: {user.displayName}
            </p>
            <p className="text-green-400/70 text-xs">
              ID: {user.externalId}
            </p>
            {user.bitmoji?.avatarUrl && (
              <img 
                src={user.bitmoji.avatarUrl} 
                alt="Bitmoji" 
                className="w-8 h-8 rounded-full mt-2"
              />
            )}
          </div>
        )}
      </div>

      {!isLoggedIn ? (
        <button
          onClick={login}
          disabled={isLoading}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-black font-semibold rounded-lg transition-colors"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <span>👻</span>
              <span>Login with Snapchat</span>
            </>
          )}
        </button>
      ) : (
        <button
          onClick={logout}
          className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          👋 Logout from Snapchat
        </button>
      )}

      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-red-300 text-sm font-medium">Authentication Error</div>
              <div className="text-red-400 text-xs mt-1">{error}</div>
            </div>
            <button
              onClick={clearError}
              className="text-red-300 hover:text-red-200 text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="text-xs text-white/60 space-y-2">
        <div className="bg-blue-500/10 rounded p-3">
          <p className="font-medium text-blue-300 mb-1">🎯 How to use Push2Web:</p>
          <ol className="space-y-1 pl-4">
            <li>1. Login with Snapchat above ☝️</li>
            <li>2. Open Lens Studio with same account</li>
            <li>3. Click "Send to Camera Kit" in dropdown</li>
            <li>4. Lens appears automatically in web app! 🎉</li>
          </ol>
        </div>
        
        <div className="bg-orange-500/10 rounded p-3">
          <p className="font-medium text-orange-300 mb-1">⚠️ Requirements:</p>
          <ul className="space-y-1 pl-4 text-xs">
            <li>• Same Snapchat account in Lens Studio</li>
            <li>• Staging OAuth client ID required</li>
            <li>• Account must be in Demo Users list</li>
            <li>• Push2Web scope: camkit_lens_push_to_device</li>
          </ul>
        </div>
      </div>
    </div>
  );
};