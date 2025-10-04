'use client';

import { useEffect, useRef, useState } from 'react';
import { MappedStop, MappedRoute, MappedVehicle } from '@/lib/gtfsMapService';

declare global {
  interface Window {
    google: any;
    initMap: () => void;
    gm_authFailure: () => void;
  }
}

interface GoogleMapsProps {
  stops: any[]; // Can be MappedStop[] or custom marker objects
  routes: MappedRoute[];
  vehicles: MappedVehicle[];
  delays?: any[]; // Delay reports from delays.json
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
  showDelays?: boolean;
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

function getDelayIcon(cause: string): { icon: string; color: string; name: string } {
  const delayTypes: Record<string, { icon: string; color: string; name: string }> = {
    'delays': { icon: '🕐', color: '#f59e0b', name: 'Opóźnienia' },
    'route-difficulties': { icon: '🚧', color: '#dc2626', name: 'Utrudnienia na trasie' },
    'no-vehicle': { icon: '❌', color: '#991b1b', name: 'Brak pojazdu' },
    'route-change': { icon: '↩️', color: '#7c3aed', name: 'Zmiana trasy' },
    'accessibility': { icon: '♿', color: '#0891b2', name: 'Problemy z dostępnością' },
    'breakdown': { icon: '⚠️', color: '#ea580c', name: 'Awaria pojazdu' },
    'overcrowding': { icon: '👥', color: '#65a30d', name: 'Tłok/Przepełnienie' },
    'ticket-control': { icon: '🎫', color: '#4338ca', name: 'Kontrola biletów' }
  };
  return delayTypes[cause] || { icon: '⚠️', color: '#6b7280', name: 'Inne utrudnienie' };
}

export default function GoogleMapsComponent({
  stops,
  routes,
  vehicles,
  delays = [],
  bounds,
  apiKey,
  onStopClick,
  onRouteClick,
  showStops = true,
  showRoutes = false,
  showVehicles = true,
  showDelays = false
}: GoogleMapsProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const vehicleMarkersRef = useRef<any[]>([]);
  const delayMarkersRef = useRef<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string>('');

  // Function to calculate distance between a point and a line segment
  const distanceToLineSegment = (point: {lat: number, lng: number}, lineStart: {lat: number, lng: number}, lineEnd: {lat: number, lng: number}): number => {
    const A = point.lat - lineStart.lat;
    const B = point.lng - lineStart.lng;
    const C = lineEnd.lat - lineStart.lat;
    const D = lineEnd.lng - lineStart.lng;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;
    if (param < 0) {
      xx = lineStart.lat;
      yy = lineStart.lng;
    } else if (param > 1) {
      xx = lineEnd.lat;
      yy = lineEnd.lng;
    } else {
      xx = lineStart.lat + param * C;
      yy = lineStart.lng + param * D;
    }

    const dx = point.lat - xx;
    const dy = point.lng - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Function to check if delays collide with route paths
  const checkDelayRouteCollisions = (delays: any[], routeConnections: any[], allStops: any[]): any[] => {
    const collisions: any[] = [];
    const collisionThreshold = 0.003; // ~300m in degrees (approximate)

    delays.forEach(delay => {
      routeConnections.forEach(route => {
        // Get shape points for this route
        if (route.shapePoints && route.shapePoints.length > 1) {
          // Check collision with shape points
          for (let i = 0; i < route.shapePoints.length - 1; i++) {
            const distance = distanceToLineSegment(
              delay.location,
              { lat: route.shapePoints[i].lat, lng: route.shapePoints[i].lng },
              { lat: route.shapePoints[i + 1].lat, lng: route.shapePoints[i + 1].lng }
            );
            
            if (distance < collisionThreshold) {
              collisions.push({
                delay: delay,
                route: route,
                distance: distance
              });
              break; // Found collision for this route, no need to check more segments
            }
          }
        } else {
          // Fallback: check collision with simplified stop-to-stop lines
          const routeStops = allStops.filter(stop => 
            stop.type === 'origin' || stop.type === 'destination'
          );
          
          if (routeStops.length >= 2) {
            for (let i = 0; i < routeStops.length - 1; i++) {
              const distance = distanceToLineSegment(
                delay.location,
                { lat: routeStops[i].lat, lng: routeStops[i].lng },
                { lat: routeStops[i + 1].lat, lng: routeStops[i + 1].lng }
              );
              
              if (distance < collisionThreshold) {
                collisions.push({
                  delay: delay,
                  route: route,
                  distance: distance
                });
                break;
              }
            }
          }
        }
      });
    });

    return collisions;
  };

  // Load Google Maps script
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.google) {
      // Suppress Google Maps error alerts
      window.gm_authFailure = () => {
        console.warn('Google Maps API key not configured or billing not enabled');
        // Don't show alert, just silently fail
      };

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        setIsLoaded(true);
      };
      
      script.onerror = () => {
        setError('Google Maps API not available');
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
          disableDefaultUI: true, // Removes all default UI controls
          zoomControl: false, // Disable zoom buttons
          mapTypeControl: false, // Disable map type selector
          scaleControl: false, // Disable scale control
          streetViewControl: false, // Disable street view control
          rotateControl: false, // Disable rotate control
          fullscreenControl: false, // Disable fullscreen control
          gestureHandling: 'greedy', // Allow all gestures without requiring ctrl/cmd
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

        // Fit bounds to show all stops and delays
        const allPoints = [...stops];
        if (delays && delays.length > 0) {
          delays.forEach(delay => {
            allPoints.push({
              lat: delay.location.lat,
              lng: delay.location.lng
            });
          });
        }

        if (allPoints.length > 0) {
          const boundsObj = new window.google.maps.LatLngBounds();
          allPoints.forEach(point => {
            boundsObj.extend(new window.google.maps.LatLng(point.lat, point.lng));
          });
          map.fitBounds(boundsObj);
          console.log('🗺️ Map bounds set to include', allPoints.length, 'points');
        }

      } catch (err) {
        setError('Failed to initialize map: ' + (err as Error).message);
      }
    }
  }, [isLoaded, bounds, stops.length, delays.length]);

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
      
      // Draw route lines using shape points
      if (stops.length === 2 && stops[0].routeConnections && stops[0].routeConnections.length > 0) {
        console.log('🗺️ Drawing route shapes using shape points');
        console.log('🚌 Route connections to draw:', stops[0].routeConnections.length);
        const routeConnections = stops[0].routeConnections;
      
        routeConnections.forEach((connection: any, index: number) => {
          const colors = ['#2563eb', '#dc2626', '#16a34a', '#f59e0b', '#7c3aed'];
          const color = colors[index % colors.length];
          
          try {
            let routePath: any[] = [];
            
            // Use shape points if available
            if (connection.shapePoints && connection.shapePoints.length > 1) {
              console.log(`🗺️ Using ${connection.shapePoints.length} shape points for route ${connection.routeShortName}`);
              routePath = connection.shapePoints.map((point: any) => ({
                lat: point.lat,
                lng: point.lng
              }));
            } else {
              // Fallback to simple line between stops
              console.log(`🗺️ Using simple line for route ${connection.routeShortName} (no shape points)`);
              routePath = [
                { lat: stops[0].lat, lng: stops[0].lng },
                { lat: stops[1].lat, lng: stops[1].lng }
              ];
            }
            
            // Create polyline with the path
            const routeLine = new window.google.maps.Polyline({
              path: routePath,
              geodesic: true,
              strokeColor: color,
              strokeOpacity: 0.8,
              strokeWeight: 4,
              map: mapInstanceRef.current
            });
            
            // Add route info window
            const routeInfoWindow = new window.google.maps.InfoWindow({
              content: `
                <div style="max-width: 200px;">
                  <h3 style="margin: 0 0 10px 0; font-size: 16px;">🚌 ${connection.routeShortName || connection.routeId}</h3>
                  <p style="margin: 5px 0; font-size: 12px; color: #666;">
                    <strong>Route:</strong> ${connection.routeLongName || 'Direct connection'}
                  </p>
                  <p style="margin: 5px 0; font-size: 12px; color: #666;">
                    <strong>Shape Points:</strong> ${connection.shapePoints?.length || 0}
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

        // Check for collisions between delays and route paths
        if (delays.length > 0) {
          console.log('🚨 Checking for delay-route collisions...');
          const collisions = checkDelayRouteCollisions(delays, routeConnections, stops);
          
          if (collisions.length > 0) {
            console.log(`⚠️ Found ${collisions.length} delay-route collisions:`, collisions);
            
            // Trigger alert for collisions
            const collisionMessages = collisions.map((collision: any) => {
              const delayInfo = getDelayIcon(collision.delay.cause);
              return `${delayInfo.icon} ${delayInfo.name} on Route ${collision.route.routeShortName}`;
            });
            
            alert(`🚨 ROUTE DISRUPTIONS DETECTED!\n\n${collisionMessages.join('\n')}\n\nThese delays may affect your planned route. Consider alternative routes or expect delays.`);
          } else {
            console.log('✅ No delay-route collisions detected');
          }
        }
      }
    }, 500); // 500ms delay to ensure map is ready

    return () => clearTimeout(drawRoutes);
  }, [stops, delays, isLoaded]);

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

  // Update delay markers
  useEffect(() => {
    console.log('🚨 Delay markers useEffect triggered:', {
      mapLoaded: !!mapInstanceRef.current,
      isLoaded,
      showDelays,
      delaysCount: delays.length,
      delays: delays
    });

    if (!mapInstanceRef.current || !isLoaded) {
      console.log('❌ Map not ready for delay markers');
      return;
    }

    // Clear existing delay markers and their animations
    delayMarkersRef.current.forEach(marker => {
      // Clear pulse interval if exists
      if ((marker as any).pulseInterval) {
        clearInterval((marker as any).pulseInterval);
      }
      marker.setMap(null);
    });
    delayMarkersRef.current = [];

    if (!showDelays) {
      console.log('❌ showDelays is false');
      return;
    }

    if (delays.length === 0) {
      console.log('❌ No delays to display');
      return;
    }

    console.log(`🚨 Adding ${delays.length} delay markers to map`);

    // Add delay markers
    delays.forEach((delay, index) => {
      console.log(`🚨 Creating delay marker ${index + 1}:`, {
        id: delay.id,
        cause: delay.cause,
        location: delay.location,
        vehicleNumber: delay.vehicleNumber
      });

      const delayInfo = getDelayIcon(delay.cause);
      console.log(`🎨 Delay icon info:`, delayInfo);

      try {
        // Create reverse shadow effect with pulsing waves and colored shadow
        const createReverseShadowSVG = (color: string, shadowOpacity: number, waveRadius: number) => {
          return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="innerShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="2" flood-color="${color}" flood-opacity="${shadowOpacity}" stdDeviation="3"/>
                  <feComposite operator="over"/>
                </filter>
              </defs>
              
              <!-- Pulsing wave circles -->
              <circle cx="40" cy="36" r="${waveRadius}" 
                      fill="none" 
                      stroke="${color}" 
                      stroke-width="2" 
                      stroke-opacity="${Math.max(0, 0.8 - waveRadius * 0.02)}"/>
              <circle cx="40" cy="36" r="${Math.max(0, waveRadius - 15)}" 
                      fill="none" 
                      stroke="${color}" 
                      stroke-width="1.5" 
                      stroke-opacity="${Math.max(0, 0.6 - (waveRadius - 15) * 0.02)}"
                      style="${waveRadius < 15 ? 'display:none' : ''}"/>
              <circle cx="40" cy="36" r="${Math.max(0, waveRadius - 30)}" 
                      fill="none" 
                      stroke="${color}" 
                      stroke-width="1" 
                      stroke-opacity="${Math.max(0, 0.4 - (waveRadius - 30) * 0.02)}"
                      style="${waveRadius < 30 ? 'display:none' : ''}"/>
              
              <!-- Main triangle with colored reverse shadow -->
              <path d="M40 12L60 52H20L40 12Z" 
                    fill="transparent" 
                    stroke="${color}" 
                    stroke-width="5" 
                    filter="url(#innerShadow)"/>
              <path d="M40 12L60 52H20L40 12Z" 
                    fill="${color}${Math.round(shadowOpacity * 255).toString(16).padStart(2, '0')}" 
                    stroke="none"/>
            </svg>
          `)}`;
        };

        const marker = new window.google.maps.Marker({
          position: { lat: delay.location.lat, lng: delay.location.lng },
          map: mapInstanceRef.current,
          title: `${delayInfo.name} - ${delay.vehicleNumber || 'No vehicle number'}`,
          icon: {
            url: createReverseShadowSVG(delayInfo.color, 0.3, 10),
            scaledSize: new window.google.maps.Size(80, 80),
            anchor: new window.google.maps.Point(40, 52)
          },
          zIndex: 2000
        });

        // Add pulsing shadow and wave animation
        let pulseDirection = 1;
        let currentShadowOpacity = 0.3;
        let waveRadius = 10;
        let waveDirection = 1;
        
        const pulseInterval = setInterval(() => {
          // Shadow pulsing
          currentShadowOpacity += pulseDirection * 0.05;
          if (currentShadowOpacity >= 0.8) {
            pulseDirection = -1;
          } else if (currentShadowOpacity <= 0.1) {
            pulseDirection = 1;
          }
          
          // Wave expanding
          waveRadius += waveDirection * 2;
          if (waveRadius >= 50) {
            waveRadius = 10; // Reset wave
          }
          
          marker.setIcon({
            url: createReverseShadowSVG(delayInfo.color, currentShadowOpacity, waveRadius),
            scaledSize: new window.google.maps.Size(80, 80),
            anchor: new window.google.maps.Point(40, 52)
          });
        }, 100); // Faster for smooth wave animation

        // Store interval reference for cleanup
        (marker as any).pulseInterval = pulseInterval;

        console.log(`✅ Created delay marker at ${delay.location.lat}, ${delay.location.lng}`);

        // Info window for delay details
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="max-width: 280px;">
              <h3 style="margin: 0 0 10px 0; font-size: 16px; color: ${delayInfo.color};">
                ${delayInfo.icon} ${delayInfo.name}
              </h3>
              ${delay.vehicleNumber ? `<p style="margin: 5px 0; font-size: 12px; color: #666;"><strong>Vehicle:</strong> ${delay.vehicleNumber}</p>` : ''}
              <p style="margin: 5px 0; font-size: 12px; color: #666;">
                <strong>Location:</strong> ${delay.location.lat.toFixed(4)}, ${delay.location.lng.toFixed(4)}
              </p>
              <p style="margin: 5px 0; font-size: 12px; color: #666;">
                <strong>Reported:</strong> ${new Date(delay.timestamp).toLocaleString()}
              </p>
              <p style="margin: 5px 0; font-size: 12px; color: #666;">
                <strong>Report ID:</strong> ${delay.id}
              </p>
            </div>
          `
        });

        marker.addListener('click', () => {
          console.log('🚨 Delay marker clicked:', delay.id);
          infoWindow.open(mapInstanceRef.current, marker);
        });

        delayMarkersRef.current.push(marker);
        console.log(`📍 Total delay markers now: ${delayMarkersRef.current.length}`);

      } catch (error) {
        console.error(`❌ Error creating delay marker ${index + 1}:`, error);
      }
    });
  }, [delays, showDelays, isLoaded]);

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
      delayMarkersRef.current.forEach(marker => {
        // Clear pulse interval if exists
        if ((marker as any).pulseInterval) {
          clearInterval((marker as any).pulseInterval);
        }
        marker.setMap(null);
      });
    };
  }, []);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 rounded">
        <div className="text-center text-gray-600">
          <div className="text-4xl mb-4">🗺️</div>
          <h3 className="font-semibold mb-2">Map View</h3>
          <p className="text-sm">Interactive map will appear here when properly configured</p>
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