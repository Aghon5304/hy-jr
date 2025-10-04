'use client';

import { useEffect, useRef, useState } from 'react';
import { MappedStop, MappedRoute, MappedVehicle } from '@/lib/gtfsMapService';

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

interface GoogleMapsProps {
  stops: any[]; // Can be MappedStop[] or custom marker objects
  routes: MappedRoute[];
  vehicles: MappedVehicle[];
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  apiKey: string;
  onStopClick?: (stop: any) => void;
  onRouteClick?: (route: MappedRoute) => void;
  showStops?: boolean;
  showRoutes?: boolean;
  showVehicles?: boolean;
}

// Helper functions
function getStopColor(stop: any): string {
  // Handle special marker types from search results
  if (stop.type === 'origin') return '#22c55e'; // Green for start
  if (stop.type === 'destination') return '#ef4444'; // Red for end
  
  // Color code based on route types served at this stop
  if (!stop.routes || stop.routes.length === 0) return '#999999';
  
  // You could enhance this to check actual route types
  // For now, using source-based coloring
  const colorMap: Record<string, string> = {
    krakow1: '#2563eb', // Blue for buses
    krakow2: '#16a34a', // Green for trams  
    krakow3: '#f59e0b', // Orange for SKA (rapid transit)
    ald: '#dc2626',     // Red for regional buses
    kml: '#7c3aed'      // Purple for trains
  };
  
  return colorMap[stop.sourceId] || '#6b7280';
}

function getRouteTypeColor(routeType: number): string {
  const colorMap: Record<number, string> = {
    0: '#16a34a', // Tram - Green
    1: '#2563eb', // Subway - Blue
    2: '#7c3aed', // Rail - Purple
    3: '#dc2626', // Bus - Red
    4: '#0891b2', // Ferry - Cyan
    11: '#ea580c' // Trolleybus - Orange
  };
  return colorMap[routeType] || '#6b7280';
}

function getRouteTypeName(type: number): string {
  const names: Record<number, string> = {
    0: 'Tram', 1: 'Subway', 2: 'Rail', 3: 'Bus', 4: 'Ferry',
    5: 'Cable Tram', 6: 'Aerial Lift', 7: 'Funicular', 11: 'Trolleybus', 12: 'Monorail'
  };
  return names[type] || `Type ${type}`;
}

export default function GoogleMapsComponent({
  stops,
  routes,
  vehicles,
  bounds,
  apiKey,
  onStopClick,
  onRouteClick,
  showStops = true,
  showRoutes = false,
  showVehicles = true
}: GoogleMapsProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const vehicleMarkersRef = useRef<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string>('');

  // Load Google Maps script
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        setIsLoaded(true);
      };
      
      script.onerror = () => {
        setError('Failed to load Google Maps API');
      };
      
      document.head.appendChild(script);
    } else if (window.google) {
      setIsLoaded(true);
    }
  }, [apiKey]);

  // Initialize map
  useEffect(() => {
    if (isLoaded && mapRef.current && !mapInstanceRef.current) {
      try {
        // Default center to Kraków if no bounds provided
        const defaultCenter = { lat: 50.0647, lng: 19.9450 };
        const center = bounds ? {
          lat: (bounds.north + bounds.south) / 2,
          lng: (bounds.east + bounds.west) / 2
        } : defaultCenter;

        const map = new window.google.maps.Map(mapRef.current, {
          zoom: 12,
          center: center,
          mapTypeId: 'roadmap',
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            },
            {
              featureType: 'transit',
              elementType: 'labels',
              stylers: [{ visibility: 'simplified' }]
            }
          ]
        });

        mapInstanceRef.current = map;

        // Fit bounds to show all stops
        if (stops.length > 0) {
          const boundsObj = new window.google.maps.LatLngBounds();
          stops.forEach(stop => {
            boundsObj.extend(new window.google.maps.LatLng(stop.lat, stop.lng));
          });
          map.fitBounds(boundsObj);
        }

      } catch (err) {
        setError('Failed to initialize map: ' + (err as Error).message);
      }
    }
  }, [isLoaded, bounds, stops.length]);

  // Update stops markers
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    if (!showStops) return;

    // Add stop markers
    stops.forEach(stop => {
      const color = getStopColor(stop);
      
      // Create simple circle marker
      const marker = new window.google.maps.Marker({
        position: { lat: stop.lat, lng: stop.lng },
        map: mapInstanceRef.current,
        title: stop.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: stop.type ? 15 : 8, // Bigger for searched stops
          fillColor: color,
          fillOpacity: 1,
          strokeWeight: 3,
          strokeColor: '#ffffff'
        },
        zIndex: stop.type ? 1000 : 100 // Higher priority for searched stops
      });

      // Info window for stop details
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="max-width: 250px;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px;">${stop.name}</h3>
            ${stop.type ? `<p style="margin: 5px 0; font-size: 12px; color: #666; font-weight: bold;"><strong>Type:</strong> ${stop.type === 'origin' ? '🟢 Starting Point' : '🔴 Destination'}</p>` : ''}
            <p style="margin: 5px 0; font-size: 12px; color: #666;">
              <strong>Stop ID:</strong> ${stop.id.split ? (stop.id.split('-')[1] || stop.id) : stop.id}
            </p>
            <p style="margin: 5px 0; font-size: 12px; color: #666;">
              <strong>Coordinates:</strong> ${stop.lat.toFixed(4)}, ${stop.lng.toFixed(4)}
            </p>
            ${stop.routes ? `<p style="margin: 5px 0; font-size: 12px; color: #666;"><strong>Routes:</strong> ${stop.routes.length} route(s)</p>` : ''}
            ${stop.sourceId ? `<p style="margin: 5px 0; font-size: 12px; color: #666;"><strong>Source:</strong> ${stop.sourceId}</p>` : ''}
            ${stop.code ? `<p style="margin: 5px 0; font-size: 12px; color: #666;"><strong>Code:</strong> ${stop.code}</p>` : ''}
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, marker);
        if (onStopClick) onStopClick(stop);
      });

      markersRef.current.push(marker);
    });
  }, [stops, showStops, isLoaded, onStopClick]);

  // Separate useEffect for route lines to ensure proper timing
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded || !window.google) return;

    // Add a small delay to ensure map is fully initialized
    const drawRoutes = setTimeout(() => {
      // Clear existing polylines first
      polylinesRef.current.forEach(polyline => {
        try {
          polyline.setMap(null);
        } catch (e) {
          console.log('Error clearing polyline:', e);
        }
      });
      polylinesRef.current = [];
      
      // Draw route lines between connected stops
      if (stops.length === 2 && stops[0].routeConnections && stops[0].routeConnections.length > 0) {
        console.log('🗺️ Drawing route lines. Map instance:', mapInstanceRef.current);
        console.log('🚌 Route connections to draw:', stops[0].routeConnections.length);
        const routeConnections = stops[0].routeConnections;
      
        routeConnections.forEach((connection: any, index: number) => {
          const colors = ['#2563eb', '#dc2626', '#16a34a', '#f59e0b', '#7c3aed'];
          const color = colors[index % colors.length];
          
          try {
            // Create polyline without setting map first
            const routeLine = new window.google.maps.Polyline({
              path: [
                { lat: stops[0].lat, lng: stops[0].lng },
                { lat: stops[1].lat, lng: stops[1].lng }
              ],
              geodesic: true,
              strokeColor: color,
              strokeOpacity: 0.8,
              strokeWeight: 6
            });
            
            // Then set the map separately with additional validation
            if (mapInstanceRef.current && mapInstanceRef.current.getDiv) {
              console.log('🗺️ Setting map for polyline, map type:', typeof mapInstanceRef.current);
              routeLine.setMap(mapInstanceRef.current);
            } else {
              console.error('❌ Invalid map instance for polyline');
              return; // Skip this polyline
            }
            
            // Add route info window
            const routeInfoWindow = new window.google.maps.InfoWindow({
              content: `
                <div style="max-width: 200px;">
                  <h3 style="margin: 0 0 10px 0; font-size: 16px;">🚌 ${connection.routeShortName || connection.routeId}</h3>
                  <p style="margin: 5px 0; font-size: 12px; color: #666;">
                    <strong>Route:</strong> ${connection.routeLongName || 'Direct connection'}
                  </p>
                  <p style="margin: 5px 0; font-size: 12px; color: #666;">
                    <strong>Source:</strong> ${connection.source}
                  </p>
                </div>
              `
            });
            
            routeLine.addListener('click', (event: any) => {
              routeInfoWindow.setPosition(event.latLng);
              routeInfoWindow.open(mapInstanceRef.current);
            });
            
            polylinesRef.current.push(routeLine);
          } catch (error) {
            console.error('Error creating route line:', error);
          }
        });
      }
    }, 500); // 500ms delay to ensure map is ready

    return () => clearTimeout(drawRoutes);
  }, [stops, isLoaded]);

  // Update vehicle markers
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    // Clear existing vehicle markers
    vehicleMarkersRef.current.forEach(marker => marker.setMap(null));
    vehicleMarkersRef.current = [];

    if (!showVehicles) return;

    // Add vehicle markers
    vehicles.forEach(vehicle => {
      const marker = new window.google.maps.Marker({
        position: { lat: vehicle.lat, lng: vehicle.lng },
        map: mapInstanceRef.current,
        title: vehicle.label || vehicle.id,
        icon: {
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#ff4444',
          fillOpacity: 0.9,
          strokeWeight: 2,
          strokeColor: '#ffffff',
          rotation: vehicle.bearing || 0
        },
        zIndex: 1000 // Show vehicles above stops
      });

      // Info window for vehicle details
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="max-width: 250px;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px;">Vehicle ${vehicle.label || vehicle.id}</h3>
            <p style="margin: 5px 0; font-size: 12px; color: #666;">
              <strong>Route:</strong> ${vehicle.routeId || 'Unknown'}
            </p>
            <p style="margin: 5px 0; font-size: 12px; color: #666;">
              <strong>Position:</strong> ${vehicle.lat.toFixed(4)}, ${vehicle.lng.toFixed(4)}
            </p>
            ${vehicle.speed ? `<p style="margin: 5px 0; font-size: 12px; color: #666;"><strong>Speed:</strong> ${vehicle.speed.toFixed(1)} m/s</p>` : ''}
            ${vehicle.bearing ? `<p style="margin: 5px 0; font-size: 12px; color: #666;"><strong>Bearing:</strong> ${vehicle.bearing}°</p>` : ''}
            ${vehicle.timestamp ? `<p style="margin: 5px 0; font-size: 12px; color: #666;"><strong>Updated:</strong> ${new Date(vehicle.timestamp * 1000).toLocaleTimeString()}</p>` : ''}
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, marker);
      });

      vehicleMarkersRef.current.push(marker);
    });
  }, [vehicles, showVehicles, isLoaded]);

  // Update route polylines
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    // Clear existing polylines
    polylinesRef.current.forEach(polyline => polyline.setMap(null));
    polylinesRef.current = [];

    if (!showRoutes) return;

    // Add route polylines (simplified - connect stops in order)
    routes.forEach(route => {
      if (route.stops.length < 2) return;

      // Get coordinates for route stops
      const routeStops = route.stops
        .map(stopId => stops.find(stop => stop.id === stopId))
        .filter(stop => stop !== undefined) as MappedStop[];

      if (routeStops.length < 2) return;

      const path = routeStops.map(stop => ({
        lat: stop.lat,
        lng: stop.lng
      }));

      const polyline = new window.google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: route.color || getRouteTypeColor(route.type),
        strokeOpacity: 0.7,
        strokeWeight: 3,
        map: mapInstanceRef.current
      });

      // Add click listener for route info
      polyline.addListener('click', (event: any) => {
        const infoWindow = new window.google.maps.InfoWindow({
          position: event.latLng,
          content: `
            <div style="max-width: 200px;">
              <h3 style="margin: 0 0 10px 0; font-size: 16px;">${route.shortName} - ${route.longName}</h3>
              <p style="margin: 5px 0; font-size: 12px; color: #666;">
                <strong>Type:</strong> ${getRouteTypeName(route.type)}
              </p>
              <p style="margin: 5px 0; font-size: 12px; color: #666;">
                <strong>Stops:</strong> ${route.stops.length}
              </p>
              <p style="margin: 5px 0; font-size: 12px; color: #666;">
                <strong>Source:</strong> ${route.sourceId}
              </p>
            </div>
          `
        });
        infoWindow.open(mapInstanceRef.current);
        
        if (onRouteClick) onRouteClick(route);
      });

      polylinesRef.current.push(polyline);
    });
  }, [routes, stops, showRoutes, isLoaded, onRouteClick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach(marker => marker.setMap(null));
      polylinesRef.current.forEach(polyline => polyline.setMap(null));
      vehicleMarkersRef.current.forEach(marker => marker.setMap(null));
    };
  }, []);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-red-50 border border-red-200 rounded">
        <div className="text-center text-red-700">
          <h3 className="font-semibold mb-2">Map Error</h3>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 rounded">
        <div className="text-center text-gray-600">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm">Loading Google Maps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <div ref={mapRef} className="h-full w-full rounded" />
    </div>
  );
}