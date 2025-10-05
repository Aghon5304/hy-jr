import { NextRequest, NextResponse } from 'next/server';

// Function to find routes that connect two stops using shape points
async function findRouteBetweenStops(stopId1: string, stopId2: string) {
  console.log('🔍 SHAPE-BASED ROUTE FINDER INITIATED');
  console.log('🎯 Target stops:', stopId1, 'and', stopId2);
  
  try {
    const sources = ['krakow1', 'krakow2', 'krakow3', 'ald', 'kml'];
    const routeConnections: any[] = [];
    
    for (const source of sources) {
      console.log(`📡 Checking source: ${source}`);
      try {
        // Construct API URLs for internal fetch calls
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : 'http://localhost:3000';
        
        // Fetch all required data
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

        console.log(`📊 ${source}: Loaded ${stopTimes.length} stop_times, ${trips.length} trips, ${routes.length} routes, ${shapes.length} shape points`);
        
        // Find trips that visit both stops
        const tripsWithStop1 = stopTimes.filter((st: any) => st.stop_id === stopId1);
        const tripsWithStop2 = stopTimes.filter((st: any) => st.stop_id === stopId2);
        
        console.log(`🚏 ${source}: Stop1 (${stopId1}) appears in ${tripsWithStop1.length} trips`);
        console.log(`🚏 ${source}: Stop2 (${stopId2}) appears in ${tripsWithStop2.length} trips`);
        
        // Find common trips with sequence validation
        const commonTrips = tripsWithStop1.filter((st1: any) => {
          const matchingStop2 = tripsWithStop2.find((st2: any) => st2.trip_id === st1.trip_id);
          if (matchingStop2) {
            // Ensure proper sequence (stop1 should come before stop2 in the trip)
            const seq1 = parseInt(st1.stop_sequence || '0');
            const seq2 = parseInt(matchingStop2.stop_sequence || '0');
            return seq1 < seq2; // Stop1 should come before Stop2
          }
          return false;
        });
        
        console.log(`🔗 ${source}: Found ${commonTrips.length} valid sequential trips`);
        
        if (commonTrips.length > 0) {
          for (const trip of commonTrips.slice(0, 3)) { // Limit to first 3 for performance
            const tripInfo = trips.find((t: any) => t.trip_id === trip.trip_id);
            if (tripInfo && tripInfo.shape_id) {
              const routeInfo = routes.find((r: any) => r.route_id === tripInfo.route_id);
              if (routeInfo) {
                // Get shape points for this trip - handle CSV array format
                console.log(`🗺️ Processing shape ${tripInfo.shape_id} for route ${routeInfo.route_short_name}`);
                
                const shapePoints = shapes
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

                const existingRoute = routeConnections.find(rc => rc.routeId === routeInfo.route_id);
                if (!existingRoute) {
                  console.log(`✅ ${source}: Found new route connection with ${shapePoints.length} shape points:`, {
                    routeId: routeInfo.route_id,
                    shortName: routeInfo.route_short_name,
                    longName: routeInfo.route_long_name,
                    shapeId: tripInfo.shape_id,
                    tripId: trip.trip_id
                  });

                  routeConnections.push({
                    routeId: routeInfo.route_id,
                    routeShortName: routeInfo.route_short_name,
                    routeLongName: routeInfo.route_long_name,
                    source: source,
                    tripId: trip.trip_id,
                    shapeId: tripInfo.shape_id,
                    shapePoints: shapePoints,
                    stops: [], // Add empty stops array to prevent undefined error
                    headsign: tripInfo.trip_headsign || routeInfo.route_long_name
                  });
                } else {
                  console.log(`🔄 ${source}: Route already found:`, routeInfo.route_short_name);
                }
              } else {
                console.log(`❓ ${source}: Route info not found for route_id:`, tripInfo.route_id);
              }
            } else {
              console.log(`❓ ${source}: Trip missing shape_id:`, trip.trip_id);
            }
          }
        } else {
          console.log(`⚫ ${source}: No valid sequential trips found`);
        }
      } catch (sourceError) {
        console.error(`💥 Error checking source ${source}:`, sourceError);
      }
      console.log(`---`);
    }
    
    console.log('🎯 FINAL SHAPE-BASED RESULTS:');
    console.log(`📊 Total route connections found: ${routeConnections.length}`);
    routeConnections.forEach((connection, index) => {
      console.log(`${index + 1}. Route ${connection.routeShortName} (${connection.routeId}) - ${connection.shapePoints?.length || 0} shape points`);
    });
    
    return routeConnections;
    
  } catch (error) {
    console.error('💥 Critical error in shape-based route finder:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromStopId = searchParams.get('from');
    const toStopId = searchParams.get('to');

    if (!fromStopId || !toStopId) {
      return NextResponse.json(
        { error: 'Missing required parameters: from and to stop IDs' },
        { status: 400 }
      );
    }

    console.log('🚀 API Route: Finding routes between stops:', { fromStopId, toStopId });

    const routeConnections = await findRouteBetweenStops(fromStopId, toStopId);

    return NextResponse.json({
      success: true,
      data: routeConnections,
      count: routeConnections.length,
      from: fromStopId,
      to: toStopId
    });

  } catch (error) {
    console.error('💥 API Error in findRoute:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}