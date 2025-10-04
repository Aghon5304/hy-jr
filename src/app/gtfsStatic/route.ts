import { NextRequest, NextResponse } from 'next/server';
import { gtfsCache, GTFS_SOURCES } from '@/lib/gtfsCache';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file'); // Query specific file: ?file=stops
  const source = searchParams.get('source') || 'krakow'; // Source: ?source=krakow
  const action = searchParams.get('action'); // Special actions: ?action=cache-info or ?action=clear-cache

  try {
    // Handle special actions
    if (action === 'sources') {
      return NextResponse.json({
        sources: gtfsCache.getAllSources(),
        usage: 'Add ?source=sourceId to specify which source to use'
      });
    }
    
    if (action === 'cache-info') {
      return NextResponse.json(gtfsCache.getCacheInfo(source === 'all' ? undefined : source));
    }
    
    if (action === 'clear-cache') {
      gtfsCache.clearCache(source === 'all' ? undefined : source);
      return NextResponse.json({ 
        message: `Cache cleared successfully${source === 'all' ? ' for all sources' : ` for source: ${source}`}` 
      });
    }

    // Validate source
    if (!GTFS_SOURCES[source]) {
      return NextResponse.json(
        { error: `Unknown source '${source}'. Available sources: ${Object.keys(GTFS_SOURCES).join(', ')}` },
        { status: 400 }
      );
    }

    // Get cached GTFS data for specific source
    const gtfsData = await gtfsCache.getGTFSData(source);
    const cacheInfo = gtfsCache.getCacheInfo(source);

    // If specific file requested, return just that file
    if (file) {
      const fileData = (gtfsData as any)[file];
      if (!fileData) {
        return NextResponse.json(
          { error: `File '${file}' not found. Available files: ${Object.keys(gtfsData).join(', ')}` },
          { status: 404 }
        );
      }

      return NextResponse.json({
        source: source,
        sourceName: GTFS_SOURCES[source].name,
        file: file,
        data: fileData,
        count: fileData.length,
        cacheInfo
      });
    }

    // Return summary of all files for this source
    const summary = Object.entries(gtfsData).map(([key, data]) => ({
      file: key,
      count: Array.isArray(data) ? data.length : 0
    }));

    return NextResponse.json({
      source: source,
      sourceName: GTFS_SOURCES[source].name,
      summary,
      totalRecords: summary.reduce((sum, file) => sum + file.count, 0),
      availableFiles: Object.keys(gtfsData),
      cacheInfo,
      usage: {
        sources: 'Add ?action=sources to see available sources',
        getSpecificFile: 'Add ?file=filename (e.g., ?file=stops)',
        changeSource: 'Add ?source=sourceId to use different source',
        cacheInfo: 'Add ?action=cache-info to see cache status',
        clearCache: 'Add ?action=clear-cache to force refresh (add &source=all to clear all)'
      }
    });

  } catch (error) {
    console.error('Error processing GTFS static data:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// Simple CSV parser function
function parseCSV(csvText: string) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
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

// Handle CSV parsing with proper comma and quote handling
function parseCSVLine(line: string): string[] {
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