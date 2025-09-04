// src/components/Push2WebManager.tsx - Updated untuk server OAuth
import React, { useState, useEffect } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { useCameraContext } from '../context/CameraContext';

interface Push2WebManagerProps {
  onLensReceived?: (lensData: any) => void;
}

export const Push2WebManager: React.FC<Push2WebManagerProps> = ({ 
  onLensReceived 
}) => {
  const { addLog, reloadLens, getPush2WebStatus } = useCameraContext();
  const [lastLensReceived, setLastLensReceived] = useState<{name: string, time: string} | null>(null);
  const [status, setStatus] = useState(getPush2WebStatus());

  // Update status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getPush2WebStatus());
    }, 5000);
    
    return () => clearInterval(interval);
  }, [getPush2WebStatus]);

  // Listen for lens received events
  useEffect(() => {
    const handleLensReceived = (event: any) => {
      if (!event.detail) return;
      
      const lensData = event.detail;
      addLog(`🎭 Push2Web lens received: ${lensData.name}`);
      
      setLastLensReceived({
        name: lensData.name,
        time: new Date().toLocaleTimeString()
      });
      
      if (onLensReceived) {
        onLensReceived(lensData);
      }
    };
    
    window.addEventListener('lensReceived', handleLensReceived);
    
    return () => {
      window.removeEventListener('lensReceived', handleLensReceived);
    };
  }, [onLensReceived, addLog]);

  const handleLogout = () => {
    // Clear session storage
    try {
      sessionStorage.removeItem('oauth_token');
      sessionStorage.removeItem('oauth_user');
      addLog('👋 Logging out Push2Web session');
      
      // Reload page to reset everything
      window.location.reload();
    } catch (error) {
      addLog(`❌ Logout failed: ${error}`);
    }
  };

  const handleReloadLens = async () => {
    try {
      addLog('🔄 Reloading current lens...');
      const success = await reloadLens();
      if (success) {
        addLog('✅ Lens reloaded successfully');
      } else {
        addLog('❌ Lens reload failed');
      }
    } catch (error) {
      addLog(`❌ Lens reload error: ${error}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-green-500/10 rounded-lg p-4">
        <h3 className="text-green-300 font-semibold mb-3 flex items-center gap-2">
          <span>✅</span>
          Push2Web Connected
        </h3>
        
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-white/70">Subscription:</span>
            <span className={status.subscribed ? 'text-green-400' : 'text-red-400'}>
              {status.subscribed ? 'Active' : 'Inactive'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-white/70">Session:</span>
            <span className={status.session ? 'text-green-400' : 'text-red-400'}>
              {status.session ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-white/70">Lens Repository:</span>
            <span className={status.repository ? 'text-green-400' : 'text-red-400'}>
              {status.repository ? 'Loaded' : 'Not loaded'}
            </span>
          </div>
        </div>

        {lastLensReceived && (
          <div className="mt-3 p-2 bg-blue-500/20 rounded text-xs">
            <div className="text-blue-300 font-medium mb-1">Latest Lens Received:</div>
            <div className="flex justify-between">
              <span className="text-white/90">{lastLensReceived.name}</span>
              <span className="text-white/70">{lastLensReceived.time}</span>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex space-x-2">
        <button
          onClick={handleReloadLens}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm font-medium"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reload Lens</span>
        </button>
        
        <button
          onClick={handleLogout}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white text-sm font-medium"
        >
          <X className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
      
      <div className="bg-black/20 rounded p-3 text-xs">
        <p className="text-white/70 mb-1">🎯 <span className="font-medium">How to use:</span></p>
        <ol className="space-y-1 text-white/60 list-decimal pl-4">
          <li>Open Lens Studio on your computer</li>
          <li>Create or open a lens project</li>
          <li>Click "Send to Camera Kit" in Lens Studio</li>
          <li>Select this device from the list</li>
          <li>Lens will appear automatically!</li>
        </ol>
      </div>
    </div>
  );
};