import { gtfsCache } from './gtfsCache';

// Interfaces for mapped data
export interface MappedStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  code?: string;
  zone?: string;
  routes: string[]; // Route IDs that serve this stop
  sourceId: string;
}

export interface MappedRoute {
  id: string;
  shortName: string;
  longName: string;
  type: number; // GTFS route type (0=tram, 1=subway, 3=bus, etc.)
  color?: string;
  textColor?: string;
  agency?: string;
  stops: string[]; // Stop IDs on this route
  sourceId: string;
}

export interface MappedTrip {
  id: string;
  routeId: string;
  serviceId: string;
  headsign?: string;
  direction?: number;
  blockId?: string;
  sourceId: string;
}

export interface MappedVehicle {
  id: string;
  routeId?: string;
  tripId?: string;
  lat: number;
  lng: number;
  bearing?: number;
  speed?: number;
  timestamp?: number;
  label?: string;
  sourceId: string;
}

export interface MapData {
  stops: MappedStop[];
  routes: MappedRoute[];
  trips: MappedTrip[];
  vehicles: MappedVehicle[];
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  stats: {
    totalStops: number;
    totalRoutes: number;
    totalVehicles: number;
    sourceCount: number;
    lastUpdated: Date;
  };
}

class GTFSMapService {
  private cachedMapData: MapData | null = null;
  private lastMapUpdate: Date | null = null;
  private readonly MAP_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for map data

  async getMapData(sourceIds: string[] = ['krakow1']): Promise<MapData> {
    // Check if we need to refresh map data
    if (this.cachedMapData && this.lastMapUpdate && 
        (Date.now() - this.lastMapUpdate.getTime()) < this.MAP_CACHE_DURATION) {
      return this.cachedMapData;
    }

    console.log('Building map data from GTFS sources:', sourceIds);
    
    const allStops: MappedStop[] = [];
    const allRoutes: MappedRoute[] = [];
    const allTrips: MappedTrip[] = [];
    
    // Process each source
    for (const sourceId of sourceIds) {
      try {
        const gtfsData = await gtfsCache.getGTFSData(sourceId);
        
        // Map stops
        const stops = this.mapStops(gtfsData.stops, sourceId);
        allStops.push(...stops);
        
        // Map routes
        const routes = this.mapRoutes(gtfsData.routes, sourceId);
        allRoutes.push(...routes);
        
        // Map trips
        const trips = this.mapTrips(gtfsData.trips, sourceId);
        allTrips.push(...trips);
        
        // Connect routes to stops using stop_times
        this.connectRoutesToStops(routes, stops, gtfsData.stopTimes);
        
      } catch (error) {
        console.error(`Failed to process GTFS data for source ${sourceId}:`, error);
      }
    }
    
    // Get real-time vehicle positions
    const vehicles = await this.getVehiclePositions();
    
    // Calculate bounds
    const bounds = this.calculateBounds(allStops);
    
    // Build final map data
    this.cachedMapData = {
      stops: allStops,
      routes: allRoutes,
      trips: allTrips,
      vehicles: vehicles,
      bounds: bounds,
      stats: {
        totalStops: allStops.length,
        totalRoutes: allRoutes.length,
        totalVehicles: vehicles.length,
        sourceCount: sourceIds.length,
        lastUpdated: new Date()
      }
    };
    
    this.lastMapUpdate = new Date();
    
    console.log(`Map data built: ${allStops.length} stops, ${allRoutes.length} routes, ${vehicles.length} vehicles`);
    
    return this.cachedMapData;
  }

  private mapStops(stops: any[], sourceId: string): MappedStop[] {
    return stops
      .filter(stop => stop.stop_lat && stop.stop_lon) // Only stops with coordinates
      .map(stop => ({
        id: `${sourceId}-${stop.stop_id}`,
        name: stop.stop_name || 'Unnamed Stop',
        lat: parseFloat(stop.stop_lat),
        lng: parseFloat(stop.stop_lon),
        code: stop.stop_code,
        zone: stop.zone_id,
        routes: [], // Will be filled by connectRoutesToStops
        sourceId: sourceId
      }));
  }

  private mapRoutes(routes: any[], sourceId: string): MappedRoute[] {
    return routes.map(route => ({
      id: `${sourceId}-${route.route_id}`,
      shortName: route.route_short_name || '',
      longName: route.route_long_name || 'Unnamed Route',
      type: parseInt(route.route_type) || 3, // Default to bus
      color: route.route_color ? `#${route.route_color}` : undefined,
      textColor: route.route_text_color ? `#${route.route_text_color}` : undefined,
      agency: route.agency_id,
      stops: [], // Will be filled by connectRoutesToStops
      sourceId: sourceId
    }));
  }

  private mapTrips(trips: any[], sourceId: string): MappedTrip[] {
    return trips.map(trip => ({
      id: `${sourceId}-${trip.trip_id}`,
      routeId: `${sourceId}-${trip.route_id}`,
      serviceId: trip.service_id,
      headsign: trip.trip_headsign,
      direction: parseInt(trip.direction_id),
      blockId: trip.block_id,
      sourceId: sourceId
    }));
  }

  private connectRoutesToStops(routes: MappedRoute[], stops: MappedStop[], stopTimes: any[]): void {
    // Create lookup maps
    const routeMap = new Map(routes.map(r => [r.id, r]));
    const stopMap = new Map(stops.map(s => [s.id, s]));
    
    // Group stop_times by route (via trip)
    const routeStops = new Map<string, Set<string>>();
    
    stopTimes.forEach(stopTime => {
      const routeId = `${routes[0]?.sourceId}-${stopTime.trip_id?.split('-')[0] || ''}`;
      const stopId = `${routes[0]?.sourceId}-${stopTime.stop_id}`;
      
      if (!routeStops.has(routeId)) {
        routeStops.set(routeId, new Set());
      }
      routeStops.get(routeId)?.add(stopId);
    });
    
    // Connect routes to stops
    routeStops.forEach((stopIds, routeId) => {
      const route = routeMap.get(routeId);
      if (route) {
        route.stops = Array.from(stopIds);
        
        // Also add route to each stop
        stopIds.forEach(stopId => {
          const stop = stopMap.get(stopId);
          if (stop && !stop.routes.includes(routeId)) {
            stop.routes.push(routeId);
          }
        });
      }
    });
  }

  private async getVehiclePositions(): Promise<MappedVehicle[]> {
    try {
      const response = await fetch('/vehiclePositions');
      const data = await response.json();
      
      if (!data.VehiclePositions) return [];
      
      return data.VehiclePositions
        .filter((vehicle: any) => vehicle.position?.latitude && vehicle.position?.longitude)
        .map((vehicle: any) => ({
          id: vehicle.vehicle?.id || `vehicle-${Date.now()}`,
          routeId: vehicle.trip?.route_id,
          tripId: vehicle.trip?.trip_id,
          lat: vehicle.position.latitude,
          lng: vehicle.position.longitude,
          bearing: vehicle.position.bearing,
          speed: vehicle.position.speed,
          timestamp: vehicle.timestamp,
          label: vehicle.vehicle?.label,
          sourceId: 'realtime-krakow'
        }));
    } catch (error) {
      console.error('Failed to fetch vehicle positions:', error);
      return [];
    }
  }

  private calculateBounds(stops: MappedStop[]): { north: number; south: number; east: number; west: number } {
    if (stops.length === 0) {
      // Default to Kraków bounds if no stops
      return { north: 50.1, south: 50.0, east: 20.1, west: 19.9 };
    }
    
    const lats = stops.map(s => s.lat);
    const lngs = stops.map(s => s.lng);
    
    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs)
    };
  }

  // Utility methods for filtering data
  getStopsByRoute(routeId: string): MappedStop[] {
    if (!this.cachedMapData) return [];
    
    const route = this.cachedMapData.routes.find(r => r.id === routeId);
    if (!route) return [];
    
    return this.cachedMapData.stops.filter(stop => route.stops.includes(stop.id));
  }

  getRoutesByType(routeType: number): MappedRoute[] {
    if (!this.cachedMapData) return [];
    return this.cachedMapData.routes.filter(route => route.type === routeType);
  }

  getStopsInBounds(bounds: { north: number; south: number; east: number; west: number }): MappedStop[] {
    if (!this.cachedMapData) return [];
    
    return this.cachedMapData.stops.filter(stop =>
      stop.lat >= bounds.south &&
      stop.lat <= bounds.north &&
      stop.lng >= bounds.west &&
      stop.lng <= bounds.east
    );
  }

  getVehiclesByRoute(routeId: string): MappedVehicle[] {
    if (!this.cachedMapData) return [];
    return this.cachedMapData.vehicles.filter(vehicle => vehicle.routeId === routeId);
  }

  clearCache(): void {
    this.cachedMapData = null;
    this.lastMapUpdate = null;
    console.log('Map data cache cleared');
  }
}

// Export singleton instance
export const gtfsMapService = new GTFSMapService();

// Route type constants for easy reference
export const ROUTE_TYPES = {
  TRAM: 0,
  SUBWAY: 1, 
  RAIL: 2,
  BUS: 3,
  FERRY: 4,
  CABLE_TRAM: 5,
  AERIAL_LIFT: 6,
  FUNICULAR: 7,
  TROLLEYBUS: 11,
  MONORAIL: 12
} as const;