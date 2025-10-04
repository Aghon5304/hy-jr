import { NextRequest, NextResponse } from 'next/server';
import { gtfsMapService } from '@/lib/gtfsMapService';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Parse parameters
  const sourcesParam = searchParams.get('sources') || 'krakow1';
  const sources = sourcesParam.split(',');
  const filter = searchParams.get('filter'); // 'stops', 'routes', 'vehicles', or 'all'
  const routeType = searchParams.get('routeType'); // Filter routes by type
  const bounds = searchParams.get('bounds'); // Format: "north,south,east,west"

  try {
    // Get the full map data
    const mapData = await gtfsMapService.getMapData(sources);
    
    // Apply filters if requested
    let response: any = mapData;
    
    if (filter === 'stops') {
      response = {
        stops: bounds ? gtfsMapService.getStopsInBounds(parseBounds(bounds)) : mapData.stops,
        bounds: mapData.bounds,
        stats: { totalStops: mapData.stops.length }
      };
    } else if (filter === 'routes') {
      response = {
        routes: routeType ? gtfsMapService.getRoutesByType(parseInt(routeType)) : mapData.routes,
        bounds: mapData.bounds,
        stats: { totalRoutes: mapData.routes.length }
      };
    } else if (filter === 'vehicles') {
      response = {
        vehicles: mapData.vehicles,
        bounds: mapData.bounds,
        stats: { totalVehicles: mapData.vehicles.length }
      };
    } else if (filter === 'summary') {
      response = {
        stats: mapData.stats,
        bounds: mapData.bounds,
        routeTypes: getRouteTypeSummary(mapData.routes),
        sourceBreakdown: getSourceBreakdown(mapData)
      };
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error processing map data:', error);
    return NextResponse.json(
      { error: 'Failed to process map data: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// Helper function to parse bounds string
function parseBounds(boundsStr: string) {
  const [north, south, east, west] = boundsStr.split(',').map(Number);
  return { north, south, east, west };
}

// Helper function to get route type summary
function getRouteTypeSummary(routes: any[]) {
  const typeCounts = routes.reduce((acc, route) => {
    acc[route.type] = (acc[route.type] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  
  return Object.entries(typeCounts).map(([type, count]) => ({
    type: parseInt(type),
    typeName: getRouteTypeName(parseInt(type)),
    count
  }));
}

// Helper function to get source breakdown
function getSourceBreakdown(mapData: any) {
  const sources = new Set([
    ...mapData.stops.map((s: any) => s.sourceId),
    ...mapData.routes.map((r: any) => r.sourceId),
    ...mapData.vehicles.map((v: any) => v.sourceId)
  ]);
  
  return Array.from(sources).map(sourceId => ({
    sourceId,
    stops: mapData.stops.filter((s: any) => s.sourceId === sourceId).length,
    routes: mapData.routes.filter((r: any) => r.sourceId === sourceId).length,
    vehicles: mapData.vehicles.filter((v: any) => v.sourceId === sourceId).length
  }));
}

// Helper function to convert route type number to name
function getRouteTypeName(type: number): string {
  const names: Record<number, string> = {
    0: 'Tram',
    1: 'Subway',
    2: 'Rail', 
    3: 'Bus',
    4: 'Ferry',
    5: 'Cable Tram',
    6: 'Aerial Lift',
    7: 'Funicular',
    11: 'Trolleybus',
    12: 'Monorail'
  };
  return names[type] || `Type ${type}`;
}