interface GTFSData {
  stops: any[];
  routes: any[];
  trips: any[];
  calendar: any[];
  stopTimes: any[];
  shapes: any[];
  agency: any[];
  calendarDates: any[];
  [key: string]: any[]; // Allow dynamic properties for different sources
}

interface GTFSSource {
  id: string;
  name: string;
  url: string;
  description?: string;
}

interface CacheEntry {
  data: GTFSData;
  lastFetched: Date;
  expiresAt: Date;
  source: GTFSSource;
}

// Predefined GTFS sources
export const GTFS_SOURCES: { [key: string]: GTFSSource } = {
  krakow1: {
    id: 'krakow',
    name: 'Kraków Public Transit',
    url: 'https://gtfs.ztp.krakow.pl/GTFS_KRK_A.zip',
    description: 'Municipal Public Transport in Kraków'
  },
  krakow2: {
    id: 'krakow',
    name: 'Kraków Public Transit',
    url: 'https://gtfs.ztp.krakow.pl/GTFS_KRK_M.zip',
    description: 'Municipal Public Transport in Kraków'
  },
  krakow3: {
    id: 'krakow',
    name: 'Kraków Public Transit',
    url: 'https://gtfs.ztp.krakow.pl/GTFS_KRK_T.zip',
    description: 'Municipal Public Transport in Kraków'
  },
  ald: {
    id: 'ald',
    name: 'Małopolska Regional Transit Autobusy',
    url: 'https://kolejemalopolskie.com.pl/rozklady_jazdy/ald-gtfs.zip',
    description: 'Regional bus services in Małopolska'
  },
  kml: {
    id: 'kml',
    name: 'Małopolska Regional Transit Koleje',
    url: 'https://kolejemalopolskie.com.pl/rozklady_jazdy/kml-ska-gtfs.zip',
    description: 'Regional train services in Małopolska'
  }

  // Add more sources as needed
  // warsaw: {
  //   id: 'warsaw',
  //   name: 'Warsaw Public Transit',
  //   url: 'https://api.warsaw.gov.pl/gtfs/static.zip'
  // }
};

class GTFSMultiCache {
  private caches: Map<string, CacheEntry> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private fetchPromises: Map<string, Promise<GTFSData>> = new Map();

  async getGTFSData(sourceId: string = 'krakow'): Promise<GTFSData> {
    const source = GTFS_SOURCES[sourceId];
    if (!source) {
      throw new Error(`Unknown GTFS source: ${sourceId}. Available sources: ${Object.keys(GTFS_SOURCES).join(', ')}`);
    }

    // Check if cache is valid for this source
    const cached = this.caches.get(sourceId);
    if (cached && new Date() < cached.expiresAt) {
      return cached.data;
    }

    // If already fetching this source, return the existing promise
    const existingPromise = this.fetchPromises.get(sourceId);
    if (existingPromise) {
      return existingPromise;
    }

    // Start fetching fresh data for this source
    const fetchPromise = this.fetchFreshData(source);
    this.fetchPromises.set(sourceId, fetchPromise);
    
    try {
      const data = await fetchPromise;
      
      // Cache the data for this source
      this.caches.set(sourceId, {
        data,
        lastFetched: new Date(),
        expiresAt: new Date(Date.now() + this.CACHE_DURATION),
        source
      });
      
      return data;
    } finally {
      this.fetchPromises.delete(sourceId);
    }
  }

  private async fetchFreshData(source: GTFSSource): Promise<GTFSData> {
    console.log(`Fetching fresh GTFS data for ${source.name}...`);
    
    const response = await fetch(source.url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch GTFS data from ${source.name}: ${response.status}`);
    }

    const zipBuffer = await response.arrayBuffer();
    
    // Import JSZip dynamically (you'll need to install it: npm install jszip)
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const contents = await zip.loadAsync(zipBuffer);

    const data: GTFSData = {
      stops: [],
      routes: [],
      trips: [],
      calendar: [],
      stopTimes: [],
      shapes: [],
      agency: [],
      calendarDates: []
    };

    // Parse each GTFS file
    const fileMap = {
      'stops.txt': 'stops',
      'routes.txt': 'routes', 
      'trips.txt': 'trips',
      'calendar.txt': 'calendar',
      'stop_times.txt': 'stopTimes',
      'shapes.txt': 'shapes',
      'agency.txt': 'agency',
      'calendar_dates.txt': 'calendarDates'
    };

    for (const [fileName, dataKey] of Object.entries(fileMap)) {
      const file = contents.file(fileName);
      if (file) {
        const csvContent = await file.async('text');
        const parsedData = this.parseCSV(csvContent);
        (data as any)[dataKey] = parsedData;
        console.log(`Loaded ${parsedData.length} records from ${fileName} for ${source.name}`);
      }
    }

    console.log(`GTFS data loaded successfully for ${source.name}`);
    return data;
  }

  private parseCSV(csvText: string): any[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index].replace(/"/g, '');
        });
        data.push(row);
      }
    }
    
    return data;
  }

  private parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  getCacheInfo(sourceId?: string) {
    if (sourceId) {
      const cached = this.caches.get(sourceId);
      if (!cached) {
        return { cached: false, sourceId };
      }
      
      return {
        cached: true,
        sourceId,
        sourceName: cached.source.name,
        lastFetched: cached.lastFetched,
        expiresAt: cached.expiresAt,
        isExpired: new Date() >= cached.expiresAt
      };
    }

    // Return info for all cached sources
    const allCaches = Array.from(this.caches.entries()).map(([id, cache]) => ({
      sourceId: id,
      sourceName: cache.source.name,
      lastFetched: cache.lastFetched,
      expiresAt: cache.expiresAt,
      isExpired: new Date() >= cache.expiresAt
    }));

    return {
      cached: allCaches.length > 0,
      sources: allCaches,
      totalSources: allCaches.length
    };
  }

  clearCache(sourceId?: string) {
    if (sourceId) {
      this.caches.delete(sourceId);
      console.log(`GTFS cache cleared for source: ${sourceId}`);
    } else {
      this.caches.clear();
      console.log('All GTFS caches cleared');
    }
  }

  getAllSources() {
    return GTFS_SOURCES;
  }
}

// Export singleton instance
export const gtfsCache = new GTFSMultiCache();