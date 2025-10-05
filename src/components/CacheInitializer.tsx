'use client';

import { useEffect, useState } from 'react';
import { useGTFSCache } from '@/lib/clientCache';
import { useSession } from '@/lib/sessionManager';

interface CacheInitializerProps {
  children: React.ReactNode;
}

export default function CacheInitializer({ children }: CacheInitializerProps) {
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationComplete, setInitializationComplete] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  
  const { initializeCache, getCacheInfo, isCacheValid } = useGTFSCache();
  const { initializeSession, isFirstTimeUser, markCacheUpdated } = useSession();

  useEffect(() => {
    const initialize = async () => {
      // Initialize session first
      const session = initializeSession();
      console.log('📱 User session initialized:', session);

      // Check if we need to initialize cache
      const needsInitialization = isFirstTimeUser() || !isCacheValid();
      
      if (needsInitialization) {
        console.log('🚀 Starting cache initialization...');
        setIsInitializing(true);
        setShowProgress(true);

        try {
          // Initialize cache with all GTFS data
          await initializeCache(true);
          
          // Mark cache as updated in session
          markCacheUpdated();
          
          console.log('✅ Cache initialization completed successfully');
          setInitializationComplete(true);
        } catch (error) {
          console.error('❌ Cache initialization failed:', error);
          // Continue without cache - app should still work with API calls
        } finally {
          setIsInitializing(false);
          // Keep progress visible for a moment to show completion
          setTimeout(() => setShowProgress(false), 2000);
        }
      } else {
        console.log('✅ Cache is valid, skipping initialization');
        setInitializationComplete(true);
      }
    };

    initialize();
  }, []);

  // Show loading screen during initialization for first-time users
  if (showProgress && isInitializing) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <div className="text-center max-w-md px-6">
          <div className="mb-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome! 👋
          </h2>
          
          <p className="text-gray-600 mb-4">
            We're setting up your personalized transit data for the first time. 
            This will only take a moment and will make the app much faster!
          </p>
          
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <div className="flex items-center text-blue-800 text-sm">
              <div className="animate-pulse mr-2">📡</div>
              Loading transit routes and stops...
            </div>
          </div>
          
          <p className="text-xs text-gray-500">
            This data will be cached for a week to improve performance
          </p>
        </div>
      </div>
    );
  }

  // Show brief success message
  if (showProgress && !isInitializing && initializationComplete) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <div className="text-center max-w-md px-6">
          <div className="mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">✅</span>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            All Set! 🎉
          </h2>
          
          <p className="text-gray-600">
            Your transit data is ready to go!
          </p>
        </div>
      </div>
    );
  }

  // Render the app normally
  return <>{children}</>;
}

// Cache status component for debugging/info
export function CacheStatus() {
  const { getCacheInfo, clearCache } = useGTFSCache();
  const [cacheInfo, setCacheInfo] = useState<any>(null);

  useEffect(() => {
    const info = getCacheInfo();
    setCacheInfo(info);
  }, []);

  if (!cacheInfo) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs max-w-xs">
      <div className="font-semibold mb-1">Cache Status</div>
      <div className="space-y-1 text-gray-600">
        <div>Status: {cacheInfo.isValid ? '✅ Valid' : '❌ Invalid'}</div>
        <div>Size: {cacheInfo.sizeEstimate}</div>
        <div>Sources: {cacheInfo.sources.length}</div>
        {cacheInfo.isValid && (
          <div>Expires: {cacheInfo.daysUntilExpiry} days</div>
        )}
      </div>
      <button 
        onClick={clearCache}
        className="mt-2 text-red-600 hover:text-red-800 text-xs"
      >
        Clear Cache
      </button>
    </div>
  );
}