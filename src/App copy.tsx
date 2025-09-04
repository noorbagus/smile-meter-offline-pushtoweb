// App.tsx - Simple Snapchat Login Test
import React, { useState, useEffect } from 'react';

// Type definitions for Snapchat SDK
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

function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addLog = (message: string) => {
    console.log(message); // Always log to console
    setLogs(prev => [...prev.slice(-19), message]);
  };

  // Initialize Snapchat Login
  useEffect(() => {
    // Log environment variables
    addLog(`Client ID: ${import.meta.env.VITE_SNAPCHAT_CLIENT_ID ? "Available" : "Missing"}`);
    addLog(`Redirect URI: ${import.meta.env.VITE_SNAPCHAT_REDIRECT_URI ? "Available" : "Missing"}`);
    
    // Define SDK initialization callback
    window.snapKitInit = function() {
      addLog("SnapKit SDK loaded");
      
      if (!window.snap?.loginkit) {
        addLog("Login kit not available");
        setError("Login SDK failed to load properly");
        return;
      }
      
      // Add delay before mounting button
      setTimeout(() => {
        try {
          addLog("Mounting login button");
          
          window.snap.loginkit.mountButton("snap-login-button", {
            clientId: import.meta.env.VITE_SNAPCHAT_CLIENT_ID,
            redirectURI: import.meta.env.VITE_SNAPCHAT_REDIRECT_URI,
            scopeList: [
              'user.display_name',
              'user.external_id',
              'user.bitmoji.avatar',
              'camkit_lens_push_to_device'
            ],
            handleResponseCallback: async () => {
              addLog("Login callback triggered");
              
              try {
                // Add delay before fetchUserInfo
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const result = await window.snap.loginkit.fetchUserInfo();
                const user = result?.data?.me;
                
                if (user) {
                  addLog(`Login successful: ${user.displayName} (${user.externalId})`);
                  if (user.bitmoji?.avatar) {
                    addLog(`Bitmoji avatar: ${user.bitmoji.avatar}`);
                  }
                } else {
                  addLog("No user data in response");
                  setError("Failed to get user data");
                }
              } catch (err) {
                const errorMessage = err instanceof Error 
                  ? err.message 
                  : JSON.stringify(err, null, 2);
                addLog(`Login error: ${errorMessage}`);
                setError(`Authentication failed: ${errorMessage}`);
              }
            }
          });
          
          addLog("Button mount completed");
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          addLog(`Button mount error: ${errorMessage}`);
          setError(`Failed to mount button: ${errorMessage}`);
        }
      }, 300);
    };
    
    // Load the SDK script
    addLog("Loading Snapchat SDK");
    const script = document.createElement('script');
    script.src = 'https://sdk.snapkit.com/js/v1/login.js';
    script.async = true;
    script.id = 'loginkit-sdk';
    
    script.onload = () => addLog("SDK script loaded successfully");
    script.onerror = () => {
      addLog("SDK script failed to load");
      setError("Failed to load Snapchat SDK");
    };
    
    document.head.appendChild(script);
    
    // Cleanup
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Snapchat Login Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Login Button</h2>
        <div 
          style={{ 
            padding: '15px', 
            border: '1px solid #ccc', 
            borderRadius: '4px',
            minHeight: '50px'
          }}
        >
          <div id="snap-login-button"></div>
        </div>
        
        {error && (
          <div style={{ 
            marginTop: '10px', 
            padding: '10px', 
            backgroundColor: '#ffebee', 
            color: '#c62828', 
            borderRadius: '4px' 
          }}>
            {error}
          </div>
        )}
      </div>
      
      <div>
        <h2>Logs</h2>
        <div 
          style={{ 
            height: '300px', 
            overflow: 'auto', 
            padding: '10px', 
            backgroundColor: '#f5f5f5',
            fontFamily: 'monospace',
            fontSize: '12px',
            borderRadius: '4px'
          }}
        >
          {logs.map((log, i) => (
            <div key={i} style={{ marginBottom: '5px' }}>{log}</div>
          ))}
          {logs.length === 0 && <div>No logs yet</div>}
        </div>
      </div>
    </div>
  );
}

export default App;