import { NextRequest, NextResponse } from 'next/server';
import { gtfsCache } from '@/lib/gtfsCache';

// Helper function to find stops matching a name with improved matching logic
function findMatchingStops(stops: any[], searchName: string): any[] {
  const normalizedSearch = searchName.toLowerCase().trim();
  
  return stops.filter((stop: any) => {
    if (!stop.stop_name) return false;
    
    const normalizedStopName = stop.stop_name.toLowerCase().trim();
    
    // Exact match (highest priority)
    if (normalizedStopName === normalizedSearch) return true;
    
    // Exact match ignoring common suffixes/prefixes
    const cleanStopName = normalizedStopName.replace(/\b(przystanek|stacja|dworzec|pl\.|plac|ul\.|ulica)\b/g, '').trim();
    const cleanSearchName = normalizedSearch.replace(/\b(przystanek|stacja|dworzec|pl\.|plac|ul\.|ulica)\b/g, '').trim();
    if (cleanStopName === cleanSearchName) return true;
    
    // Word-based matching (stop name contains all words from search)
    const searchWords = normalizedSearch.split(/\s+/).filter(word => word.length > 2);
    const stopWords = normalizedStopName.split(/\s+/);
    
    if (searchWords.length > 0) {
      const matchesAllWords = searchWords.every(searchWord => 
        stopWords.some(stopWord => 
          stopWord.includes(searchWord) || searchWord.includes(stopWord)
        )
      );
      if (matchesAllWords) return true;
    }
    
    // Fallback: contains match for longer searches
    if (normalizedSearch.length > 4 && normalizedStopName.includes(normalizedSearch)) {
      return true;
    }
    
    return false;
  });
}

// Helper function to find valid connections between two groups of stops
function findValidConnections(stopTimes: any[], stopIds1: string[], stopIds2: string[]): any[] {
  const connections: any[] = [];
  
  // Create maps for faster lookup
  const stopTimesMap = new Map<string, any[]>();
  
  // Group stop_times by trip_id for faster lookup
  stopTimes.forEach(st => {
    if (!stopTimesMap.has(st.trip_id)) {
      stopTimesMap.set(st.trip_id, []);
    }
    stopTimesMap.get(st.trip_id)!.push(st);
  });
  
  console.log(`🔍 Checking ${stopTimesMap.size} unique trips for connections...`);
  
  // Check each trip for valid connections
  for (const [tripId, tripStopTimes] of stopTimesMap.entries()) {
    // Sort by stop_sequence to ensure proper order
    const sortedStopTimes = tripStopTimes.sort((a, b) => 
      parseInt(a.stop_sequence || '0') - parseInt(b.stop_sequence || '0')
    );
    
    // Find all occurrences of stops from group 1 and group 2
    const stops1InTrip = sortedStopTimes.filter(st => stopIds1.includes(st.stop_id));
    const stops2InTrip = sortedStopTimes.filter(st => stopIds2.includes(st.stop_id));
    
    if (stops1InTrip.length === 0 || stops2InTrip.length === 0) continue;
    
    // Find valid sequential connections (stop1 before stop2)
    for (const stop1 of stops1InTrip) {
      for (const stop2 of stops2InTrip) {
        const seq1 = parseInt(stop1.stop_sequence || '0');
        const seq2 = parseInt(stop2.stop_sequence || '0');
        
        if (seq1 < seq2) {
          // Find stop names for better logging
          const fromStopName = `Stop ${stop1.stop_id}`;
          const toStopName = `Stop ${stop2.stop_id}`;
          
          connections.push({
            trip_id: tripId,
            fromStopId: stop1.stop_id,
            toStopId: stop2.stop_id,
            fromStopName,
            toStopName,
            fromSequence: seq1,
            toSequence: seq2
          });
          
          // Only take the first valid connection per trip to avoid duplicates
          break;
        }
      }
      // Break outer loop if we found a connection for this trip
      if (connections.some(c => c.trip_id === tripId)) break;
    }
  }
  
  return connections;
}

// Function to find routes that connect two stops using shape points and stop names
async function findRouteBetweenStops(stopName1: string, stopName2: string) {
  console.log('🔍 NAME-BASED ROUTE FINDER INITIATED');
  console.log('🎯 Target stops by name:', stopName1, 'and', stopName2);
  
  try {
    const sources = ['krakow1', 'krakow2', 'krakow3', 'ald', 'kml'];
    
    for (const source of sources) {
      console.log(`📡 Checking source: ${source}`);
      try {
        // Construct API URLs for internal fetch calls
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : 'http://localhost:3000';
        
        // Try to get data from server-side cache first
        try {
          console.log(`📦 ${source}: Attempting to use cached data...`);
          const cachedData = await gtfsCache.getGTFSData(source);
          
          const stopTimes = cachedData.stopTimes || [];
          const trips = cachedData.trips || [];
          const routes = cachedData.routes || [];
          const shapes = cachedData.shapes || [];
          const stops = cachedData.stops || [];

          console.log(`📦 ${source}: Using cached data - ${stopTimes.length} stop_times, ${trips.length} trips, ${routes.length} routes, ${shapes.length} shape points, ${stops.length} stops`);
          
          const route = await processSourceDataForFirst(source, stopTimes, trips, routes, shapes, stops, stopName1, stopName2);
          if (route) {
            console.log(`🎯 First route found in source: ${source}`);
            return [route];
          }
          
        } catch (cacheError) {
          console.log(`⚠️ ${source}: Cache failed, falling back to API calls...`, cacheError);
          
          // Fallback to API calls if cache fails
          const [stopTimesResponse, tripsResponse, routesResponse, shapesResponse] = await Promise.all([
            fetch(`${baseUrl}/api/gtfsStatic?source=${source}&file=stopTimes`),
            fetch(`${baseUrl}/api/gtfsStatic?source=${source}&file=trips`),
            fetch(`${baseUrl}/api/gtfsStatic?source=${source}&file=routes`),
            fetch(`${baseUrl}/api/gtfsStatic?source=${source}&file=shapes`)
          ]);

          if (!stopTimesResponse.ok || !tripsResponse.ok || !routesResponse.ok) {
            console.log(`❌ Failed to fetch required data from ${source}`);
            continue;
          }

          const [stopTimesData, tripsData, routesData, shapesData] = await Promise.all([
            stopTimesResponse.json(),
            tripsResponse.json(),
            routesResponse.json(),
            shapesResponse.ok ? shapesResponse.json() : { data: [] }
          ]);

          const stopTimes = stopTimesData.data || [];
          const trips = tripsData.data || [];
          const routes = routesData.data || [];
          const shapes = shapesData.data || [];

          // Get stops data to match names with IDs
          const stopsResponse = await fetch(`${baseUrl}/api/gtfsStatic?file=stops&source=${source}`);
          const stopsData = stopsResponse.ok ? await stopsResponse.json() : { data: [] };
          const stops = stopsData.data || [];

          console.log(`🌐 ${source}: Using API data - ${stopTimes.length} stop_times, ${trips.length} trips, ${routes.length} routes, ${shapes.length} shape points, ${stops.length} stops`);
          
          const route = await processSourceDataForFirst(source, stopTimes, trips, routes, shapes, stops, stopName1, stopName2);
          if (route) {
            console.log(`🎯 First route found in source: ${source}`);
            return [route];
          }
        }
      } catch (sourceError) {
        console.error(`❌ Error processing source ${source}:`, sourceError);
        continue;
      }
    }

    console.log(`🎯 Route search completed. No routes found.`);
    return [];

  } catch (error) {
    console.error('💥 Error in findRouteBetweenStops:', error);
    return [];
  }
}

// Extract the data processing logic into a separate function that returns first found route
async function processSourceDataForFirst(
  source: string,
  stopTimes: any[],
  trips: any[],
  routes: any[],
  shapes: any[],
  stops: any[],
  stopName1: string,
  stopName2: string
): Promise<any | null> {
  console.log(`📊 ${source}: Processing ${stopTimes.length} stop_times, ${trips.length} trips, ${routes.length} routes, ${shapes.length} shape points, ${stops.length} stops`);
  
  try {
    // Find all stops that match the names using improved matching
    const matchingStops1 = findMatchingStops(stops, stopName1);
    const matchingStops2 = findMatchingStops(stops, stopName2);

    console.log(`🏷️ ${source}: Found ${matchingStops1.length} stops matching "${stopName1}"`);
    console.log(`🏷️ ${source}: Found ${matchingStops2.length} stops matching "${stopName2}"`);
    
    // Log the actual stop names found for debugging
    if (matchingStops1.length > 0) {
      console.log(`  📍 Stop 1 matches: ${matchingStops1.map(s => `${s.stop_name} (${s.stop_id})`).slice(0, 5).join(', ')}${matchingStops1.length > 5 ? '...' : ''}`);
    }
    if (matchingStops2.length > 0) {
      console.log(`  📍 Stop 2 matches: ${matchingStops2.map(s => `${s.stop_name} (${s.stop_id})`).slice(0, 5).join(', ')}${matchingStops2.length > 5 ? '...' : ''}`);
    }

    if (matchingStops1.length === 0 || matchingStops2.length === 0) {
      console.log(`⚠️ ${source}: No matching stops found, skipping this source`);
      return null;
    }

    // Get all stop IDs for both stop names
    const stopIds1 = matchingStops1.map((stop: any) => stop.stop_id);
    const stopIds2 = matchingStops2.map((stop: any) => stop.stop_id);
    
    console.log(`🔍 ${source}: Searching for trips with stop IDs: [${stopIds1.slice(0, 3).join(', ')}${stopIds1.length > 3 ? '...' : ''}] to [${stopIds2.slice(0, 3).join(', ')}${stopIds2.length > 3 ? '...' : ''}]`);
    
    // Find all possible connections between any stop in group 1 and any stop in group 2
    const validConnections = findValidConnections(stopTimes, stopIds1, stopIds2);
    
    console.log(`🔗 ${source}: Found ${validConnections.length} valid connections`);
    
    if (validConnections.length === 0) {
      console.log(`⚫ ${source}: No valid sequential trips found`);
      return null;
    }
    
    // Process only the first connection found
    const connection = validConnections[0];
    const tripInfo = trips.find((t: any) => t.trip_id === connection.trip_id);
    
    if (tripInfo && tripInfo.route_id) {
      const routeInfo = routes.find((r: any) => r.route_id === tripInfo.route_id);
      if (routeInfo) {
        console.log(`🚌 ${source}: Processing first route ${routeInfo.route_short_name} (${routeInfo.route_id})`);
        
        let shapePoints: any[] = [];
        
        if (tripInfo.shape_id) {
          // Get shape points for this trip - handle CSV array format
          console.log(`🗺️ Processing shape ${tripInfo.shape_id} for route ${routeInfo.route_short_name}`);
          
          shapePoints = shapes
            .filter((s: any) => {
              // Handle both object format and array format
              const shapeId = s.shape_id || s[0];
              return shapeId === tripInfo.shape_id;
            })
            .sort((a: any, b: any) => {
              // Sort by sequence number - handle CSV array format
              const seqA = parseInt(a.shape_pt_sequence || a[3] || '0');
              const seqB = parseInt(b.shape_pt_sequence || b[3] || '0');
              return seqA - seqB;
            })
            .map((s: any) => {
              // Parse coordinates from CSV array format: [shape_id, lat, lng, sequence]
              let lat, lng, sequence;
              
              if (Array.isArray(s) || s[0] !== undefined) {
                // CSV array format
                lat = parseFloat(s[1]);
                lng = parseFloat(s[2]);
                sequence = parseInt(s[3] || '0');
              } else {
                // Object format
                lat = parseFloat(s.shape_pt_lat);
                lng = parseFloat(s.shape_pt_lon);
                sequence = parseInt(s.shape_pt_sequence || '0');
              }
              
              return {
                lat: lat,
                lng: lng,
                sequence: sequence,
                shapeId: s.shape_id || s[0]
              };
            })
            .filter((point: any) => !isNaN(point.lat) && !isNaN(point.lng) && point.lat !== 0 && point.lng !== 0); // Filter out invalid coordinates
          
          console.log(`📍 Shape ${tripInfo.shape_id}: Found ${shapePoints.length} valid coordinate points`);
          if (shapePoints.length > 0) {
            console.log(`🎯 First point: ${shapePoints[0].lat}, ${shapePoints[0].lng}`);
            console.log(`🏁 Last point: ${shapePoints[shapePoints.length - 1].lat}, ${shapePoints[shapePoints.length - 1].lng}`);
          }
        }

        const routeConnection = {
          routeId: routeInfo.route_id,
          routeShortName: routeInfo.route_short_name,
          routeLongName: routeInfo.route_long_name,
          source: source,
          tripId: connection.trip_id,
          shapeId: tripInfo.shape_id,
          shapePoints: shapePoints,
          stops: [], // Add empty stops array to prevent undefined error
          headsign: tripInfo.trip_headsign || routeInfo.route_long_name,
          fromStopId: connection.fromStopId,
          toStopId: connection.toStopId,
          fromStopName: connection.fromStopName,
          toStopName: connection.toStopName
        };
        
        console.log(`✅ ${source}: Found first route ${routeInfo.route_short_name} connecting ${connection.fromStopName} → ${connection.toStopName}`);
        return routeConnection;
      }
    }
    
    console.log(`❓ ${source}: No valid route found for first connection`);
    return null;
    
  } catch (error) {
    console.error(`💥 Error processing source ${source}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromStopName = searchParams.get('from');
    const toStopName = searchParams.get('to');

    if (!fromStopName || !toStopName) {
      return NextResponse.json(
        { error: 'Missing required parameters: from and to stop names' },
        { status: 400 }
      );
    }

    console.log('🚀 API Route: Finding routes between stops:', { fromStopName, toStopName });

    const routeConnections = await findRouteBetweenStops(fromStopName, toStopName);

    return NextResponse.json({
      success: true,
      data: routeConnections,
      count: routeConnections.length,
      from: fromStopName,
      to: toStopName
    });

  } catch (error) {
    console.error('💥 API Error in findRoute:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}