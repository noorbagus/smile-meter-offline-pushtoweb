import React from 'react';
import { useOAuth } from '../hooks/useOAuth';
import { useCameraContext } from '../context/CameraContext';

interface Push2WebManagerProps {
  onLensReceived?: (lensData: any) => void;
}

export const Push2WebManager: React.FC<Push2WebManagerProps> = ({ onLensReceived }) => {
  const { addLog } = useCameraContext();
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
            <span className="text-white/70">Push2Web Ready:</span>
            <span className={isLoggedIn && accessToken ? 'text-green-400' : 'text-orange-400'}>
              {isLoggedIn && accessToken ? '✅ Ready' : '⏳ Waiting'}
            </span>
          </div>
        </div>

        {user && (
          <div className="mt-3 p-3 bg-green-500/10 rounded">
            <p className="text-green-300 font-medium text-sm">
              Logged in as: {user.displayName}
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
          👋 Logout
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
            <li>1. Login with Snapchat above</li>
            <li>2. Open Lens Studio with same account</li>
            <li>3. Click "Send to Camera Kit"</li>
            <li>4. Lens appears automatically!</li>
          </ol>
        </div>
        
        <div className="bg-orange-500/10 rounded p-3">
          <p className="font-medium text-orange-300 mb-1">⚠️ Requirements:</p>
          <ul className="space-y-1 pl-4 text-xs">
            <li>• Same Snapchat account in Lens Studio</li>
            <li>• Staging OAuth token only</li>
            <li>• Account must be in Demo Users list</li>
          </ul>
        </div>
      </div>
    </div>
  );
};