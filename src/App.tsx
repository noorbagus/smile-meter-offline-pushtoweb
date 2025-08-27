// src/App.tsx - Fixed variable declarations
import React, { useState, useEffect, useCallback } from 'react';
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
import { LoginKit } from './components/LoginKit';
import { checkAndRedirect, isInstagramBrowser, retryRedirect } from './utils/instagramBrowserDetector';
import { Maximize, X } from 'lucide-react';

const CameraApp: React.FC = () => {
  // All state declarations first
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [appReady, setAppReady] = useState<boolean>(false);
  
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showExitButton, setShowExitButton] = useState<boolean>(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [exitButtonTimer, setExitButtonTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Push2Web state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [showLogin, setShowLogin] = useState<boolean>(false);
  const [enablePush2Web, setEnablePush2Web] = useState<boolean>(true);

  // Context hooks
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
    subscribePush2Web,
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

  // Functions that depend on state
  const handleSnapchatLogin = useCallback(async (accessToken: string, userInfo: any) => {
    try {
      addLog('🔗 Snapchat login successful, subscribing to Push2Web...');
      const success = await subscribePush2Web(accessToken);
      
      if (success) {
        setIsLoggedIn(true);
        setShowLogin(false);
        addLog('✅ Push2Web ready - can receive lenses from Lens Studio');
      } else {
        addLog('❌ Push2Web subscription failed');
      }
    } catch (error) {
      addLog(`❌ Login error: ${error}`);
    }
  }, [subscribePush2Web, addLog]);

  const initializeApp = useCallback(async () => {
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

      const success = await initializeCameraKit(stream, cameraFeedRef);
      if (success) {
        addLog('🎉 App initialization complete');
        if (enablePush2Web && !isLoggedIn) {
          setTimeout(() => setShowLogin(true), 2000);
        }
      }
    } catch (error) {
      addLog(`❌ Initialization failed: ${error}`);
    }
  }, [cameraState, addLog, checkCameraPermission, requestCameraStream, currentFacingMode, initializeCameraKit, cameraFeedRef, enablePush2Web, isLoggedIn]);

  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      if ('orientation' in screen && 'lock' in screen.orientation) {
        try {
          await (screen.orientation as any).lock('portrait');
          addLog('🔒 Portrait orientation locked');
        } catch (orientationError) {
          addLog(`⚠️ Orientation lock failed: ${orientationError}`);
        }
      }
      document.body.classList.add('fullscreen-locked');
      setIsFullscreen(true);
      addLog('🖥️ Fullscreen mode activated');
    } catch (error) {
      addLog(`❌ Fullscreen failed: ${error}`);
    }
  }, [addLog]);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      document.body.classList.remove('fullscreen-locked');
      if ('orientation' in screen && 'unlock' in screen.orientation) {
        try {
          (screen.orientation as any).unlock();
          addLog('🔓 Orientation unlocked');
        } catch (orientationError) {
          addLog(`⚠️ Orientation unlock failed: ${orientationError}`);
        }
      }
      setIsFullscreen(false);
      setShowExitButton(false);
      addLog('🖥️ Fullscreen mode exited');
    } catch (error) {
      addLog(`❌ Exit fullscreen failed: ${error}`);
    }
  }, [addLog]);

  // Initialize app when ready
  useEffect(() => {
    if (appReady) {
      addLog('🚀 App initialization starting...');
      initializeApp();
    }
  }, [appReady, initializeApp, addLog]);

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
              onClick={() => retryRedirect()}
              className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg text-white font-medium"
            >
              Try Again
            </button>
          </div>
        ) : (
          <LoadingScreen message="Web AR Netramaya" />
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
          onClose={() => {
            setShowPreview(false);
            setTimeout(() => restoreCameraFeed(), 100);
          }}
          onDownload={() => {
            downloadVideo();
            setTimeout(() => {
              setShowPreview(false);
              restoreCameraFeed();
            }, 500);
          }}
          onProcessAndShare={() => {
            addLog('🎬 Starting video processing...');
            processAndShareVideo();
          }}
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

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Camera Feed */}
      <CameraFeed
        cameraFeedRef={cameraFeedRef}
        cameraState={cameraState}
        recordingState={recordingState}
        isFlipped={isFlipped}
      />

      {/* Push2Web Login Modal */}
      {enablePush2Web && showLogin && !isLoggedIn && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 max-w-sm w-full mx-auto">
            <div className="text-center mb-4">
              <h3 className="text-white text-lg font-bold mb-2">🎯 Push2Web Login</h3>
              <p className="text-white/70 text-sm">Connect to receive lenses from Lens Studio</p>
            </div>
            
            <LoginKit 
              onLogin={handleSnapchatLogin}
              onError={(error) => addLog(`❌ Login error: ${error}`)}
              addLog={addLog}
            />
            
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowLogin(false)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white text-sm"
              >
                Skip for now
              </button>
              <button
                onClick={() => {
                  setEnablePush2Web(false);
                  setShowLogin(false);
                  addLog('🔇 Push2Web disabled');
                }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm"
              >
                Disable Push2Web
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Controls */}
      <CameraControls
        onSettings={() => setShowSettings(true)}
        onFlip={() => setIsFlipped(!isFlipped)}
      />

      {/* Recording Controls */}
      <RecordingControls
        recordingState={recordingState}
        recordingTime={recordingTime}
        onToggleRecording={() => {
          const canvas = getCanvas();
          const stream = getStream();
          if (canvas && stream) {
            toggleRecording(canvas, stream);
          }
        }}
        onGallery={() => reloadLens()}
        onSwitchCamera={() => switchCamera()}
        formatTime={formatTime}
        disabled={!isReady}
      />

      {/* Fullscreen Entry Button */}
      {!isFullscreen && isReady && (
        <button
          onClick={enterFullscreen}
          className="fullscreen-button"
          aria-label="Enter Fullscreen"
        >
          <Maximize className="w-6 h-6" />
        </button>
      )}

      {/* Exit Fullscreen Button */}
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

      {/* Loading Screen */}
      {cameraState === 'initializing' && (
        <LoadingScreen 
          message="Initializing Web AR Netramaya..."
          subMessage="Setting up camera and AR engine..."
        />
      )}

      {/* Error Screen */}
      {(cameraState === 'error' || cameraState === 'permission_denied' || cameraState === 'https_required') && errorInfo && (
        <ErrorScreen
          errorInfo={errorInfo}
          permissionState={permissionState}
          onRequestPermission={async () => {
            const stream = await requestPermission();
            if (stream) {
              stream.getTracks().forEach(track => track.stop());
              initializeApp();
            }
          }}
          onRetry={initializeApp}
          debugInfo={{
            protocol: location.protocol,
            hostname: location.hostname,
            userAgent: navigator.userAgent
          }}
        />
      )}

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        debugLogs={debugLogs}
        onExportLogs={exportLogs}
        currentStream={getStream()}
        canvas={getCanvas()}
        containerRef={cameraFeedRef}
      />

      {/* Rendering Modal */}
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