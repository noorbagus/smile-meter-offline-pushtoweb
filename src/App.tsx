// Modified App.tsx with Push2Web Integration
import React, { useState, useEffect, useRef } from 'react';
import { 
  CameraProvider, 
  RecordingProvider, 
  useCameraContext, 
  useRecordingContext 
} from './context';
import {
  LoadingScreen,
  ErrorScreen,
  CameraFeed,
  CameraControls,
  RecordingControls,
  VideoPreview,
  SettingsPanel,
  RenderingModal
} from './components';
import { checkAndRedirect, isInstagramBrowser, retryRedirect } from './utils/instagramBrowserDetector';
import { Maximize, X } from 'lucide-react';
import { Push2Web } from '@snap/push2web'; // Make sure this is imported

// Define types for Snapchat SDK
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

const CameraApp: React.FC = () => {
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [appReady, setAppReady] = useState<boolean>(false);
  
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showExitButton, setShowExitButton] = useState<boolean>(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [tapCount, setTapCount] = useState<number>(0);
  const [exitButtonTimer, setExitButtonTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Snapchat Login & Push2Web state
  const [showLogin, setShowLogin] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  const {
    cameraState,
    currentFacingMode,
    permissionState,
    errorInfo,
    initializeCameraKit,
    switchCamera,
    reloadLens,
    requestCameraStream,
    requestPermission,
    checkCameraPermission,
    cameraFeedRef,
    getCanvas,
    getStream,
    addLog,
    debugLogs,
    exportLogs,
    isReady,
    restoreCameraFeed,
    subscribePush2Web, // This should be implemented in your CameraContext
    getPush2WebStatus
  } = useCameraContext();

  const {
    recordingState,
    recordingTime,
    recordedVideo,
    toggleRecording,
    formatTime,
    downloadVideo,
    showPreview,
    setShowPreview,
    processAndShareVideo,
    processingProgress,
    processingMessage,
    processingError,
    showRenderingModal,
    setShowRenderingModal
  } = useRecordingContext();

  // Fullscreen functions
  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      document.body.classList.add('fullscreen-locked');
      setIsFullscreen(true);
      addLog('🖥️ Fullscreen mode activated');
    } catch (error) {
      addLog(`❌ Fullscreen failed: ${error}`);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      document.body.classList.remove('fullscreen-locked');
      setIsFullscreen(false);
      setShowExitButton(false);
      addLog('🖥️ Fullscreen mode exited');
    } catch (error) {
      addLog(`❌ Exit fullscreen failed: ${error}`);
    }
  };

  const handleLongPress = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isFullscreen) return;
    
    e.preventDefault();
    
    const timer = setTimeout(() => {
      setShowExitButton(true);
      addLog('📱 Long press detected - showing exit button');
      
      // Auto-hide exit button after 5 seconds
      const hideTimer = setTimeout(() => {
        setShowExitButton(false);
        addLog('⏰ Exit button auto-hidden');
      }, 5000);
      
      setExitButtonTimer(hideTimer);
    }, 1500); // 1.5 second long press
    
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleDoubleTap = () => {
    if (!isFullscreen) return;
    
    setTapCount(prev => {
      if (prev === 0) {
        // First tap
        setTimeout(() => setTapCount(0), 500); // Reset after 500ms
        return 1;
      } else if (prev === 1) {
        // Second tap - show exit button
        setShowExitButton(true);
        addLog('👆 Double tap detected - showing exit button');
        
        // Auto-hide exit button after 5 seconds
        const hideTimer = setTimeout(() => {
          setShowExitButton(false);
          addLog('⏰ Exit button auto-hidden');
        }, 5000);
        
        setExitButtonTimer(hideTimer);
        return 0;
      }
      return 0;
    });
  };

  // Initialize Snapchat Login
  useEffect(() => {
    if (showLogin) {
      // Define the SDK callback function
      window.snapKitInit = () => {
        addLog('🎭 SnapKit SDK loaded');
        
        if (!window.snap?.loginkit) {
          addLog('❌ SnapKit LoginKit not available');
          setLoginError('Login SDK failed to load');
          return;
        }
        
        // Add delay to ensure DOM is ready
        setTimeout(() => {
          try {
            addLog('🔄 Mounting Snapchat login button');
            
            (window.snap as any).loginkit.mountButton('snap-login-button', {
              clientId: import.meta.env.VITE_SNAPCHAT_CLIENT_ID,
              redirectURI: import.meta.env.VITE_SNAPCHAT_REDIRECT_URI,
              scopeList: [
                'user.display_name',
                'user.external_id',
                'user.bitmoji.avatar',
                'camkit_lens_push_to_device' // Required for Push2Web
              ],
              handleResponseCallback: async () => {
                addLog('🔗 Login callback triggered');
                
                try {
                  // Add delay before fetchUserInfo
                  await new Promise(resolve => setTimeout(resolve, 500));
                  
                  const result = await window.snap?.loginkit.fetchUserInfo();
                  const user = result?.data?.me;
                  
                  if (user) {
                    addLog(`✅ Logged in as: ${user.displayName}`);
                    setUserInfo(user);
                    setIsLoggedIn(true);
                    setLoginError(null);
                    
                    // Connect to Push2Web with Camera Kit
                    const success = await subscribePush2Web(`snap_${user.externalId}_${Date.now()}`);
                    
                    if (success) {
                      addLog('🎬 Push2Web connection successful');
                      addLog('🎭 Ready to receive lenses from Lens Studio');
                    } else {
                      addLog('❌ Push2Web connection failed');
                      setLoginError('Failed to connect to Push2Web');
                    }
                  } else {
                    addLog('❌ No user data in response');
                    setLoginError('Failed to get user data');
                  }
                } catch (err) {
                  const errorMessage = err instanceof Error 
                    ? err.message 
                    : JSON.stringify(err, null, 2);
                  addLog(`❌ Login error: ${errorMessage}`);
                  setLoginError(`Authentication failed: ${errorMessage}`);
                }
              }
            });
            
            addLog('✅ Button mounted successfully');
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            addLog(`❌ Button mount error: ${errorMessage}`);
            setLoginError(`Failed to mount button: ${errorMessage}`);
          }
        }, 300);
      };
      
      // Load the SDK script
      const script = document.createElement('script');
      script.src = 'https://sdk.snapkit.com/js/v1/login.js';
      script.async = true;
      script.id = 'loginkit-sdk';
      script.onload = () => addLog('📜 SDK script loaded');
      script.onerror = () => {
        addLog('❌ SDK script failed to load');
        setLoginError('Failed to load Snapchat SDK');
      };
      
      document.head.appendChild(script);
      
      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
  }, [showLogin, addLog, subscribePush2Web]);

  // Instagram redirect check
  useEffect(() => {
    const shouldRedirect = checkAndRedirect();
    
    if (shouldRedirect) {
      addLog('📱 Instagram redirect in progress...');
      setTimeout(() => {
        addLog('⏰ Redirect timeout - continuing with app');
        setAppReady(true);
      }, 3000);
    } else {
      addLog('✅ Browser check complete - initializing app');
      setAppReady(true);
    }
  }, [addLog]);

  // Auto-recovery on app focus/visibility
  useEffect(() => {
    const handleFocus = () => {
      if (cameraState === 'ready') {
        addLog('🔄 App focused - checking camera feed...');
        setTimeout(() => restoreCameraFeed(), 200);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && cameraState === 'ready') {
        addLog('👁️ App visible - restoring camera...');
        setTimeout(() => restoreCameraFeed(), 100);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [cameraState, addLog, restoreCameraFeed]);

  const initializeApp = async () => {
    if (cameraState === 'ready') {
      addLog('📱 Camera already ready');
      return;
    }

    try {
      addLog('🎬 Starting app initialization...');
      
      const hasPermission = await checkCameraPermission();
      if (!hasPermission) return;

      const stream = await requestCameraStream(currentFacingMode, true);
      if (!stream) return;

      const audioTracks = stream.getAudioTracks();
      const videoTracks = stream.getVideoTracks();
      addLog(`📊 Camera stream: ${videoTracks.length} video, ${audioTracks.length} audio tracks`);
      
      if (audioTracks.length === 0) {
        addLog('🔇 WARNING: No audio tracks in camera stream - recordings will be silent!');
      }

      const success = await initializeCameraKit(stream, cameraFeedRef);
      if (success) {
        addLog('🎉 App initialization complete');
      }
    } catch (error) {
      addLog(`❌ Initialization failed: ${error}`);
    }
  };

  const handleSwitchCamera = async () => {
    if (!isReady) return;
    
    try {
      addLog('🔄 Switching camera...');
      const newStream = await switchCamera();
      if (newStream) {
        const audioTracks = newStream.getAudioTracks();
        addLog(`✅ Camera switched - Audio tracks: ${audioTracks.length}`);
      }
    } catch (error) {
      addLog(`❌ Camera switch failed: ${error}`);
    }
  };

  const handleToggleRecording = () => {
    const canvas = getCanvas();
    const stream = getStream();
    
    if (!canvas) {
      addLog('❌ Canvas not available');
      return;
    }

    if (stream) {
      const audioTracks = stream.getAudioTracks();
      const videoTracks = stream.getVideoTracks();
      
      addLog(`📊 Pre-recording stream check: ${videoTracks.length} video, ${audioTracks.length} audio tracks`);
      
      if (audioTracks.length === 0) {
        addLog('🔇 CRITICAL WARNING: No audio tracks in camera stream!');
      }
    } else {
      addLog('❌ No camera stream available for recording');
      return;
    }

    toggleRecording(canvas, stream || undefined);
  };

  const handleReloadEffect = async () => {
    if (!isReady) {
      addLog('❌ Cannot reload - camera not ready');
      return;
    }
    
    try {
      addLog('🔄 Reloading AR effect...');
      const success = await reloadLens();
      
      if (success) {
        addLog('✅ AR effect reloaded successfully');
      } else {
        addLog('❌ Failed to reload AR effect');
      }
    } catch (error) {
      addLog(`❌ Reload error: ${error}`);
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    addLog('📱 Preview closed');
    setTimeout(() => restoreCameraFeed(), 100);
  };

  const handleProcessAndShare = () => {
    addLog('🎬 Starting video processing...');
    processAndShareVideo();
  };

  const handleDownload = () => {
    downloadVideo();
    setTimeout(() => {
      setShowPreview(false);
      restoreCameraFeed();
    }, 500);
  };

  // Initialize app when ready
  useEffect(() => {
    if (appReady) {
      addLog('🚀 App initialization starting...');
      initializeApp();
    }
  }, [appReady]);

  const handleRequestPermission = async () => {
    try {
      addLog('🔒 Requesting camera + microphone permission...');
      const stream = await requestPermission();
      if (stream) {
        const audioTracks = stream.getAudioTracks();
        addLog(`✅ Permission granted with ${audioTracks.length} audio tracks`);
        stream.getTracks().forEach(track => track.stop());
        initializeApp();
      }
    } catch (error) {
      addLog(`❌ Permission failed: ${error}`);
    }
  };

  const handleRetry = () => {
    addLog('🔄 Retrying app initialization...');
    initializeApp();
  };

  const handleRetryRedirect = () => {
    addLog('📱 Manual Instagram redirect retry...');
    retryRedirect();
  };

  // Show loading while checking/redirecting
  if (!appReady) {
    const isInInstagram = isInstagramBrowser();
    
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        {isInInstagram ? (
          <div className="text-center text-white p-6">
            <div className="text-6xl mb-6">🚀</div>
            <h2 className="text-2xl font-bold mb-4">Opening in Safari..</h2>
            <p className="text-white/70 mb-6">For the best AR experience</p>
            <button
              onClick={handleRetryRedirect}
              className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg text-white font-medium"
            >
              Try Again
            </button>
            <p className="text-xs text-white/50 mt-4">
              If redirect fails, manually copy URL to Safari
            </p>
          </div>
        ) : (
          <LoadingScreen 
            message="Web AR Netramaya"
            subMessage="Checking browser compatibility..."
          />
        )}
      </div>
    );
  }

  // Video preview
  if (showPreview && recordedVideo) {
    return (
      <>
        <VideoPreview
          recordedVideo={recordedVideo}
          onClose={handleClosePreview}
          onDownload={handleDownload}
          onProcessAndShare={handleProcessAndShare}
        />
        
        <RenderingModal
          isOpen={showRenderingModal}
          progress={processingProgress}
          message={processingMessage}
          isComplete={processingProgress === 100 && !processingError}
          hasError={!!processingError}
          onCancel={() => {
            setShowRenderingModal(false);
            addLog('❌ Processing cancelled');
            setTimeout(() => restoreCameraFeed(), 100);
          }}
        />
      </>
    );
  }

  // Push2Web Login Modal
  if (showLogin) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-lg flex items-center justify-center p-6">
        <div className="bg-gray-800/80 backdrop-blur-md rounded-xl max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-white text-xl font-semibold">Snapchat Login</h2>
            <button 
              onClick={() => setShowLogin(false)}
              className="text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="bg-black/30 rounded-lg p-4 mb-4">
            <div id="snap-login-button" className="min-h-[48px] w-full"></div>
          </div>
          
          {loginError && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4 text-red-300 text-sm">
              {loginError}
            </div>
          )}
          
          {isLoggedIn && userInfo && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-4">
              <div className="text-green-300 font-medium">
                Logged in as: {userInfo.displayName}
              </div>
              <div className="text-green-300/70 text-sm mt-1">
                Push2Web enabled and ready!
              </div>
              {userInfo.bitmoji?.avatar && (
                <img 
                  src={userInfo.bitmoji.avatar} 
                  alt="Bitmoji" 
                  className="w-10 h-10 rounded-full mt-2"
                />
              )}
            </div>
          )}
          
          <div className="text-xs text-white/60 space-y-1 mb-4">
            <p>• Login with your Snapchat account</p>
            <p>• Enable Push2Web to receive lenses</p>
            <p>• Must be same account as Lens Studio</p>
          </div>
          
          <button
            onClick={() => setShowLogin(false)}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium"
          >
            {isLoggedIn ? 'Return to Camera' : 'Cancel'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black flex flex-col"
      onTouchStart={handleLongPress}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleLongPress}
      onMouseUp={handleTouchEnd}
      onClick={handleDoubleTap}
    >
      {/* Camera Feed */}
      <CameraFeed
        cameraFeedRef={cameraFeedRef}
        cameraState={cameraState}
        recordingState={recordingState}
        isFlipped={isFlipped}
      />

      {/* Push2Web Button - Always visible in top corner */}
      <button
        onClick={() => setShowLogin(true)}
        className="absolute top-4 left-4 z-40 w-10 h-10 bg-yellow-500/90 rounded-full flex items-center justify-center shadow-lg"
        aria-label="Push2Web Login"
      >
        <span className="text-sm">👻</span>
      </button>

      {/* Camera Controls - Already hidden via updated component */}
      <CameraControls
        onSettings={() => setShowSettings(true)}
        onFlip={() => setIsFlipped(!isFlipped)}
      />

      {/* Recording Controls - Already hidden via updated component */}
      <RecordingControls
        recordingState={recordingState}
        recordingTime={recordingTime}
        onToggleRecording={handleToggleRecording}
        onGallery={handleReloadEffect}
        onSwitchCamera={handleSwitchCamera}
        formatTime={formatTime}
        disabled={!isReady}
      />

      {/* Fullscreen Entry Button - Show only when NOT in fullscreen */}
      {!isFullscreen && isReady && (
        <button
          onClick={enterFullscreen}
          className="fullscreen-button"
          aria-label="Enter Fullscreen"
        >
          <Maximize className="w-6 h-6" />
        </button>
      )}

      {/* Exit Fullscreen Button - Show only when in fullscreen and exit button is visible */}
      {isFullscreen && showExitButton && (
        <button
          onClick={() => {
            setShowExitButton(false);
            exitFullscreen();
          }}
          className="exit-fullscreen-button"
          aria-label="Exit Fullscreen"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Essential modals */}
      {cameraState === 'initializing' && (
        <LoadingScreen 
          message="Initializing Web AR Netramaya..."
          subMessage="Setting up camera and AR engine..."
        />
      )}

      {(cameraState === 'error' || cameraState === 'permission_denied' || cameraState === 'https_required') && errorInfo && (
        <ErrorScreen
          errorInfo={errorInfo}
          permissionState={permissionState}
          onRequestPermission={handleRequestPermission}
          onRetry={handleRetry}
          debugInfo={{
            protocol: location.protocol,
            hostname: location.hostname,
            userAgent: navigator.userAgent
          }}
        />
      )}

      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        debugLogs={debugLogs}
        onExportLogs={exportLogs}
        currentStream={getStream()}
        canvas={getCanvas()}
        containerRef={cameraFeedRef}
      />

      <RenderingModal
        isOpen={showRenderingModal && !showPreview}
        progress={processingProgress}
        message={processingMessage}
        isComplete={processingProgress === 100 && !processingError}
        hasError={!!processingError}
        onCancel={() => {
          setShowRenderingModal(false);
          addLog('❌ Processing cancelled');
          setTimeout(() => restoreCameraFeed(), 100);
        }}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <CameraProvider>
      <RecordingProvider addLog={() => {}}>
        <AppWithContext />
      </RecordingProvider>
    </CameraProvider>
  );
};

const AppWithContext: React.FC = () => {
  const { addLog, restoreCameraFeed } = useCameraContext();
  
  return (
    <RecordingProvider addLog={addLog} restoreCameraFeed={restoreCameraFeed}>
      <CameraApp />
    </RecordingProvider>
  );
};

export default App;