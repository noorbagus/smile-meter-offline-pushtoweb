// src/hooks/usePush2Web.ts - Complete Push2Web integration
import { useState, useCallback, useRef, useEffect } from 'react';
import { Push2Web } from '@snap/push2web';

export interface Push2WebStatus {
  available: boolean;
  subscribed: boolean;
  session: boolean;
  repository: boolean;
  error: string | null;
}

export interface LensReceivedData {
  id: string;
  name: string;
  iconUrl?: string;
  cameraFacingPreference: 'CAMERA_FACING_UNSET' | 'CAMERA_FACING_FRONT' | 'CAMERA_FACING_BACK';
  lensCreator?: string;
}

export interface Push2WebEventHandlers {
  onLensReceived?: (data: LensReceivedData) => void;
  onError?: (error: string) => void;
  onSubscriptionChanged?: (state: any) => void;
}

export const usePush2Web = (
  addLog: (message: string) => void,
  handlers?: Push2WebEventHandlers
) => {
  const [status, setStatus] = useState<Push2WebStatus>({
    available: false,
    subscribed: false,
    session: false,
    repository: false,
    error: null
  });

  const [lastLensReceived, setLastLensReceived] = useState<LensReceivedData | null>(null);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  const push2WebRef = useRef<Push2Web | null>(null);
  const subscriptionRef = useRef<any>(null);
  const eventListenersSetup = useRef<boolean>(false);

  // Initialize Push2Web instance
  const initializePush2Web = useCallback(() => {
    if (push2WebRef.current) {
      addLog('🎯 Push2Web already initialized');
      return push2WebRef.current;
    }

    try {
      addLog('🎯 Initializing Push2Web...');
      const push2Web = new Push2Web();

      // Setup event listeners only once
      if (!eventListenersSetup.current) {
        // Lens Received Event
        push2Web.events.addEventListener('lensReceived', (event: any) => {
          const lensData = event.detail;
          addLog(`📸 Lens received: ${lensData.name} (${lensData.id})`);
          addLog(`   - Icon: ${lensData.iconUrl || 'N/A'}`);
          addLog(`   - Camera: ${lensData.cameraFacingPreference}`);
          
          const transformedData: LensReceivedData = {
            id: lensData.id,
            name: lensData.name,
            iconUrl: lensData.iconUrl,
            cameraFacingPreference: lensData.cameraFacingPreference || 'CAMERA_FACING_UNSET',
            lensCreator: lensData.lensCreator
          };
          
          setLastLensReceived(transformedData);
          handlers?.onLensReceived?.(transformedData);
        });

        // Error Event
        push2Web.events.addEventListener('error', (event: CustomEvent) => {
          const errorDetails = event.detail;
          const errorMessage = errorDetails?.message || 'Unknown Push2Web error';
          
          addLog(`❌ Push2Web error: ${errorMessage}`);
          setStatus(prev => ({ ...prev, error: errorMessage }));
          handlers?.onError?.(errorMessage);
        });

        // Subscription Changed Event
        push2Web.events.addEventListener('subscriptionChanged', (event: CustomEvent) => {
          const subState = event.detail;
          addLog(`🔄 Subscription state changed: ${JSON.stringify(subState)}`);
          
          setStatus(prev => ({ 
            ...prev, 
            subscribed: subState === 'subscribed' 
          }));
          
          setConnectionState(subState === 'subscribed' ? 'connected' : 'disconnected');
          handlers?.onSubscriptionChanged?.(subState);
        });

        eventListenersSetup.current = true;
      }

      push2WebRef.current = push2Web;
      setStatus(prev => ({ ...prev, available: true, error: null }));
      addLog('✅ Push2Web initialized successfully');

      return push2Web;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize Push2Web';
      addLog(`❌ Push2Web initialization failed: ${errorMessage}`);
      setStatus(prev => ({ ...prev, available: false, error: errorMessage }));
      return null;
    }
  }, [addLog, handlers]);

  // Get Push2Web extension for Camera Kit bootstrap
  const getExtension = useCallback(() => {
    const push2Web = initializePush2Web();
    if (!push2Web) {
      throw new Error('Failed to initialize Push2Web');
    }
    return push2Web.extension;
  }, [initializePush2Web]);

  // Subscribe to Push2Web events
  const subscribe = useCallback(async (
    accessToken: string,
    cameraKitSession: any,
    lensRepository: any
  ): Promise<boolean> => {
    const push2Web = initializePush2Web();
    if (!push2Web) {
      addLog('❌ Push2Web not available for subscription');
      return false;
    }

    if (!accessToken) {
      addLog('❌ Access token required for Push2Web subscription');
      setStatus(prev => ({ ...prev, error: 'Access token required' }));
      return false;
    }

    try {
      addLog('🔗 Subscribing to Push2Web...');
      addLog(`   - Token: ${accessToken.substring(0, 10)}...`);
      addLog(`   - Session: ${!!cameraKitSession}`);
      addLog(`   - Repository: ${!!lensRepository}`);
      
      setConnectionState('connecting');
      setStatus(prev => ({ ...prev, error: null }));

      // Subscribe with all required parameters
      const subscription = push2Web.subscribe(
        accessToken,
        cameraKitSession,
        lensRepository
      );

      subscriptionRef.current = subscription;
      
      setStatus(prev => ({
        ...prev,
        subscribed: true,
        session: !!cameraKitSession,
        repository: !!lensRepository
      }));

      setConnectionState('connected');
      addLog('✅ Push2Web subscription successful');
      addLog('🎬 Ready to receive lenses from Lens Studio');
      
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Subscription failed';
      addLog(`❌ Push2Web subscription failed: ${errorMessage}`);
      
      setStatus(prev => ({ 
        ...prev, 
        subscribed: false, 
        error: errorMessage 
      }));
      
      setConnectionState('disconnected');
      return false;
    }
  }, [initializePush2Web, addLog]);

  // Unsubscribe from Push2Web
  const unsubscribe = useCallback(() => {
    if (subscriptionRef.current) {
      try {
        // If subscription has unsubscribe method
        if (typeof subscriptionRef.current.unsubscribe === 'function') {
          subscriptionRef.current.unsubscribe();
        }
        
        subscriptionRef.current = null;
        setStatus(prev => ({ ...prev, subscribed: false }));
        setConnectionState('disconnected');
        addLog('🔌 Push2Web unsubscribed');
        
      } catch (error) {
        addLog(`⚠️ Unsubscribe error: ${error}`);
      }
    }
  }, [addLog]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  // Test Push2Web availability
  const testAvailability = useCallback(() => {
    try {
      const push2Web = initializePush2Web();
      return !!push2Web;
    } catch (error) {
      return false;
    }
  }, [initializePush2Web]);

  // Get status summary
  const getStatusSummary = useCallback(() => {
    return {
      ...status,
      connectionState,
      lastLensReceived: lastLensReceived?.name || null,
      isReady: status.available && status.subscribed && !status.error
    };
  }, [status, connectionState, lastLensReceived]);

  // Clear error
  const clearError = useCallback(() => {
    setStatus(prev => ({ ...prev, error: null }));
  }, []);

  // Force reconnect
  const reconnect = useCallback(async (
    accessToken: string,
    cameraKitSession: any,
    lensRepository: any
  ) => {
    addLog('🔄 Forcing Push2Web reconnection...');
    unsubscribe();
    
    // Wait a moment before reconnecting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return await subscribe(accessToken, cameraKitSession, lensRepository);
  }, [addLog, unsubscribe, subscribe]);

  return {
    // Status
    status,
    connectionState,
    lastLensReceived,
    isAvailable: status.available,
    isSubscribed: status.subscribed,
    isReady: status.available && status.subscribed && !status.error,
    hasError: !!status.error,

    // Actions
    initializePush2Web,
    getExtension,
    subscribe,
    unsubscribe,
    reconnect,
    testAvailability,
    clearError,

    // Utilities
    getStatusSummary
  };
};