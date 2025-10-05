'use client';

// Client-side caching system for GTFS data
// Caches data on first login and recaches after a week

interface CachedGTFSData {
  stops: any[];
  routes: any[];
  trips: any[];
  stopTimes: any[];
  shapes: any[];
  calendar: any[];
  agency: any[];
  calendarDates: any[];
}

interface CacheMetadata {
  cachedAt: string; // ISO date string
  expiresAt: string; // ISO date string
  version: string;
  sources: string[];
}

interface FullCacheEntry {
  metadata: CacheMetadata;
  data: { [sourceId: string]: CachedGTFSData };
}

class ClientGTFSCache {
  private readonly CACHE_KEY = 'gtfs_data_cache';
  private readonly CACHE_METADATA_KEY = 'gtfs_cache_metadata';
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  private readonly CACHE_VERSION = '1.0.0';
  private readonly SOURCES = ['krakow1', 'krakow2', 'krakow3', 'ald', 'kml'];

  private cache: FullCacheEntry | null = null;
  private isInitializing = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadCacheFromStorage();
    }
  }

  /**
   * Initialize cache on first login or if cache is expired
   */
  async initializeCache(forceRefresh = false): Promise<void> {
    if (this.isInitializing && this.initializationPromise) {
      return this.initializationPromise;
    }

    if (!forceRefresh && this.isCacheValid()) {
      console.log('🎯 Cache is valid, skipping initialization');
      return;
    }

    console.log('🚀 Initializing GTFS data cache...');
    this.isInitializing = true;

    this.initializationPromise = this.fetchAndCacheAllData();

    try {
      await this.initializationPromise;
      console.log('✅ Cache initialization completed');
    } finally {
      this.isInitializing = false;
      this.initializationPromise = null;
    }
  }

  /**
   * Get cached data for a specific source and file type
   */
  async getCachedData(sourceId: string, fileType: keyof CachedGTFSData): Promise<any[] | null> {
    if (!this.isCacheValid()) {
      console.warn(`⚠️ Cache expired or invalid for ${sourceId}:${fileType}`);
      return null;
    }

    const sourceData = this.cache?.data[sourceId];
    if (!sourceData) {
      console.warn(`⚠️ No cached data found for source: ${sourceId}`);
      return null;
    }

    return sourceData[fileType] || null;
  }

  /**
   * Get all cached data for a source
   */
  async getAllCachedData(sourceId: string): Promise<CachedGTFSData | null> {
    if (!this.isCacheValid()) {
      console.warn(`⚠️ Cache expired or invalid for ${sourceId}`);
      return null;
    }

    return this.cache?.data[sourceId] || null;
  }

  /**
   * Check if cache is valid and not expired
   */
  isCacheValid(): boolean {
    if (!this.cache || !this.cache.metadata) {
      return false;
    }

    const now = new Date();
    const expiresAt = new Date(this.cache.metadata.expiresAt);
    const isExpired = now >= expiresAt;

    if (isExpired) {
      console.log('⏰ Cache has expired');
      return false;
    }

    // Check version compatibility
    if (this.cache.metadata.version !== this.CACHE_VERSION) {
      console.log('🔄 Cache version mismatch, needs refresh');
      return false;
    }

    return true;
  }

  /**
   * Get cache status information
   */
  getCacheInfo() {
    if (!this.cache) {
      return {
        isValid: false,
        cachedAt: null,
        expiresAt: null,
        sources: [],
        version: null,
        sizeEstimate: '0 KB'
      };
    }

    const sizeEstimate = this.estimateCacheSize();
    const now = new Date();
    const expiresAt = new Date(this.cache.metadata.expiresAt);
    
    return {
      isValid: this.isCacheValid(),
      cachedAt: this.cache.metadata.cachedAt,
      expiresAt: this.cache.metadata.expiresAt,
      sources: this.cache.metadata.sources,
      version: this.cache.metadata.version,
      sizeEstimate,
      timeUntilExpiry: Math.max(0, expiresAt.getTime() - now.getTime()),
      daysUntilExpiry: Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
    };
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(this.CACHE_KEY);
      localStorage.removeItem(this.CACHE_METADATA_KEY);
      this.cache = null;
      console.log('🗑️ Cache cleared successfully');
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    }
  }

  /**
   * Fetch and cache all GTFS data from all sources
   */
  private async fetchAndCacheAllData(): Promise<void> {
    const startTime = Date.now();
    const newCacheData: { [sourceId: string]: CachedGTFSData } = {};
    
    console.log(`📡 Fetching data from ${this.SOURCES.length} sources...`);

    for (const sourceId of this.SOURCES) {
      try {
        console.log(`🔄 Fetching data for source: ${sourceId}`);
        const sourceData = await this.fetchSourceData(sourceId);
        newCacheData[sourceId] = sourceData;
        console.log(`✅ Successfully cached ${sourceId}`);
      } catch (error) {
        console.error(`❌ Failed to fetch data for ${sourceId}:`, error);
        // Continue with other sources even if one fails
      }
    }

    // Create cache entry
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.CACHE_DURATION);

    this.cache = {
      metadata: {
        cachedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        version: this.CACHE_VERSION,
        sources: Object.keys(newCacheData)
      },
      data: newCacheData
    };

    // Save to localStorage
    this.saveCacheToStorage();

    const duration = Date.now() - startTime;
    console.log(`🎉 Cache initialization completed in ${duration}ms`);
    console.log(`📊 Cached data for ${Object.keys(newCacheData).length} sources`);
    console.log(`⏰ Cache expires at: ${expiresAt.toLocaleString()}`);
  }

  /**
   * Fetch all GTFS data for a specific source
   */
  private async fetchSourceData(sourceId: string): Promise<CachedGTFSData> {
    const fileTypes: (keyof CachedGTFSData)[] = [
      'stops', 'routes', 'trips', 'stopTimes', 'shapes', 'calendar', 'agency', 'calendarDates'
    ];

    const sourceData: CachedGTFSData = {
      stops: [],
      routes: [],
      trips: [],
      stopTimes: [],
      shapes: [],
      calendar: [],
      agency: [],
      calendarDates: []
    };

    // Fetch all file types for this source
    for (const fileType of fileTypes) {
      try {
        const apiFileType = fileType === 'calendarDates' ? 'calendar_dates' : fileType;
        const response = await fetch(`/api/gtfsStatic?source=${sourceId}&file=${apiFileType}`);
        
        if (response.ok) {
          const result = await response.json();
          sourceData[fileType] = result.data || [];
          console.log(`  📄 ${sourceId}:${fileType} - ${sourceData[fileType].length} records`);
        } else {
          console.warn(`⚠️ Failed to fetch ${sourceId}:${fileType} - ${response.status}`);
          sourceData[fileType] = [];
        }
      } catch (error) {
        console.error(`❌ Error fetching ${sourceId}:${fileType}:`, error);
        sourceData[fileType] = [];
      }
    }

    return sourceData;
  }

  /**
   * Load cache from localStorage
   */
  private loadCacheFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const cacheData = localStorage.getItem(this.CACHE_KEY);
      if (cacheData) {
        this.cache = JSON.parse(cacheData);
        console.log('📦 Loaded cache from localStorage');
      }
    } catch (error) {
      console.error('❌ Failed to load cache from localStorage:', error);
      this.cache = null;
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveCacheToStorage(): void {
    if (typeof window === 'undefined' || !this.cache) return;

    try {
      const cacheStr = JSON.stringify(this.cache);
      localStorage.setItem(this.CACHE_KEY, cacheStr);
      console.log('💾 Saved cache to localStorage');
    } catch (error) {
      console.error('❌ Failed to save cache to localStorage:', error);
      
      // If localStorage is full, try to clear old cache and try again
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.log('💽 Storage quota exceeded, clearing old cache...');
        this.clearCache();
        try {
          const cacheStr = JSON.stringify(this.cache);
          localStorage.setItem(this.CACHE_KEY, cacheStr);
          console.log('💾 Saved cache to localStorage after clearing');
        } catch (retryError) {
          console.error('❌ Failed to save cache even after clearing:', retryError);
        }
      }
    }
  }

  /**
   * Estimate cache size for display purposes
   */
  private estimateCacheSize(): string {
    if (!this.cache) return '0 KB';

    try {
      const cacheStr = JSON.stringify(this.cache);
      const sizeBytes = new Blob([cacheStr]).size;
      
      if (sizeBytes < 1024) return `${sizeBytes} B`;
      if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
      return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
    } catch (error) {
      return 'Unknown';
    }
  }
}

// Export singleton instance
export const clientGTFSCache = new ClientGTFSCache();

// Hook for React components
export function useGTFSCache() {
  return {
    initializeCache: (forceRefresh?: boolean) => clientGTFSCache.initializeCache(forceRefresh),
    getCachedData: (sourceId: string, fileType: keyof CachedGTFSData) => 
      clientGTFSCache.getCachedData(sourceId, fileType),
    getAllCachedData: (sourceId: string) => clientGTFSCache.getAllCachedData(sourceId),
    isCacheValid: () => clientGTFSCache.isCacheValid(),
    getCacheInfo: () => clientGTFSCache.getCacheInfo(),
    clearCache: () => clientGTFSCache.clearCache()
  };
}