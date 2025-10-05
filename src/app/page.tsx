'use client';

import { useState, useEffect } from 'react';
import TripPlanner, { TripPlanData } from '@/components/TripPlanner';
import ReportIssueWidget from '@/components/ReportIssueWidget';
import { Report } from '@/types/Report';
import ReportDifficultyDrawer from '@/components/ReportDifficultyDrawer';
import GoogleMapsComponent from '@/components/GoogleMapsComponent'; // DODANY IMPORT
import TripIssuesNotification from '@/components/TripIssuesNotification';
import TripInfoPanel from '@/components/TripInfoPanel';
import UserPanel from '@/components/UserPanel';

// Styling variables
const styles = {
  main: "relative h-screen overflow-hidden",
  mapBackground: "absolute inset-0", // USUNIĘTE bg-green-100 flex items-center justify-center
  overlay: "relative z-10 p-4 h-screen pointer-events-none",
  container: "max-w-sm mx-auto h-full flex flex-col justify-start pt-1 pb-8",
  floatingCard: "bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 pointer-events-auto",
  title: "text-2xl font-bold text-gray-900 mb-6 text-center",
  divider: {
    container: "flex items-center my-6",
    line: "flex-1 border-t border-gray-300",
    text: "px-4 text-sm text-gray-500"
  },
  viewTripButton: "w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-4 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2 active:bg-gray-300",
  reportDifficultyButton: "w-full bg-red-500 hover:bg-red-600 text-white font-medium py-4 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2 active:bg-red-700",
  viewTripIcon: "text-lg"
};

export default function Home() {
  const [isDifficultyDrawerOpen, setIsDifficultyDrawerOpen] = useState(false);
  const [showTripIssuesNotification, setShowTripIssuesNotification] = useState(false);
  const [selectedIssueType, setSelectedIssueType] = useState<string>('');
  const [isTripInfoOpen, setIsTripInfoOpen] = useState(false);
  const [searchedStops, setSearchedStops] = useState<any[]>([]);
  const [liveVehicles, setLiveVehicles] = useState<any[]>([]);
  const [selectedRoutes, setSelectedRoutes] = useState<any[]>([]);
  const [delays, setDelays] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [routeCollisions, setRouteCollisions] = useState<any[]>([]);

  // Function to fetch delays from delays.json
  const fetchDelays = async () => {
    try {
      console.log('🚨 Fetching delay reports from API...');
      const response = await fetch('/api/delays');
      console.log('📡 API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        const delayReports = data.delays || [];
        console.log(`📊 Loaded ${delayReports.length} delay reports:`, delayReports);
        console.log('🗺️ Setting delays state:', delayReports);
        setDelays(delayReports);
        
        // Log each delay location
        delayReports.forEach((delay: any, index: number) => {
          console.log(`🚨 Delay ${index + 1}: ${delay.cause} at ${delay.location.lat}, ${delay.location.lng}`);
        });
      } else {
        console.error('❌ Failed to fetch delays, status:', response.status);
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
      }
    } catch (error) {
      console.error('💥 Error fetching delays:', error);
    }
  };

  // Load delays on page initialization
  useEffect(() => {
    fetchDelays();
  }, []);

  // Function to fetch real-time vehicle positions
  const fetchRealTimeVehicles = async (routeIds: string[]) => {
    console.log('🚌 FETCHING REAL-TIME VEHICLES FOR ROUTES:', routeIds);
    
    try {
      const sources = ['krakow1', 'krakow2', 'krakow3', 'ald', 'kml'];
      const allVehicles: any[] = [];
      
      for (const source of sources) {
        try {
          // Fetch real-time vehicle positions
          const vehicleResponse = await fetch(`/api/vehiclePositions`);
          if (!vehicleResponse.ok) {
            console.log(``);
            continue;
          }
          
          const vehicleData = await vehicleResponse.json();
          const vehicles = vehicleData.entity || [];
          
          // Filter vehicles that are on our selected routes
          const relevantVehicles = vehicles.filter((vehicle: any) => {
            const trip = vehicle.vehicle?.trip;
            return trip && routeIds.some(routeId => {
              // Check if vehicle's route matches any of our selected routes
              return trip.routeId === routeId || 
                     vehicle.vehicle?.vehicle?.label?.includes(routeId) ||
                     trip.tripId?.includes(routeId);
            });
          });
          
          console.log(`✅ ${source}: ${relevantVehicles.length} vehicles on selected routes`);
          
          // Transform vehicle data for map display
          const transformedVehicles = relevantVehicles.map((vehicle: any) => ({
            id: vehicle.id,
            vehicleId: vehicle.vehicle?.vehicle?.id || vehicle.id,
            label: vehicle.vehicle?.vehicle?.label || 'Unknown',
            position: {
              lat: vehicle.vehicle?.position?.latitude,
              lng: vehicle.vehicle?.position?.longitude
            },
            bearing: vehicle.vehicle?.position?.bearing || 0,
            speed: vehicle.vehicle?.position?.speed || 0,
            tripId: vehicle.vehicle?.trip?.tripId,
            routeId: vehicle.vehicle?.trip?.routeId,
            timestamp: vehicle.vehicle?.timestamp,
            source: source,
            status: vehicle.vehicle?.currentStatus || 'IN_TRANSIT_TO'
          })).filter((v: any) => v.position.lat && v.position.lng); // Only include vehicles with valid positions
          
          allVehicles.push(...transformedVehicles);
          
        } catch (sourceError) {
          console.error(`💥 Error fetching vehicles from ${source}:`, sourceError);
        }
      }
      
      console.log(`🎯 TOTAL LIVE VEHICLES FOUND: ${allVehicles.length}`);
      allVehicles.forEach((vehicle, index) => {
        console.log(`${index + 1}. Vehicle ${vehicle.label} at ${vehicle.position.lat}, ${vehicle.position.lng} (Route: ${vehicle.routeId})`);
      });
      
      return allVehicles;
      
    } catch (error) {
      console.error('💥 Error fetching real-time vehicles:', error);
      return [];
    }
  };

  // Function to find routes that connect two stops using shape points
  const findRouteBetweenStops = async (stopId1: string, stopId2: string) => {
    console.log('🔍 SHAPE-BASED ROUTE FINDER INITIATED');
    console.log('🎯 Target stops:', stopId1, 'and', stopId2);
    
    try {
      const sources = ['krakow1', 'krakow2', 'krakow3', 'ald', 'kml'];
      const routeConnections: any[] = [];
      
      for (const source of sources) {
        console.log(`📡 Checking source: ${source}`);
        try {
          // Fetch all required data
          const [stopTimesResponse, tripsResponse, routesResponse, shapesResponse] = await Promise.all([
            fetch(`/api/gtfsStatic?source=${source}&file=stopTimes`),
            fetch(`/api/gtfsStatic?source=${source}&file=trips`),
            fetch(`/api/gtfsStatic?source=${source}&file=routes`),
            fetch(`/api/gtfsStatic?source=${source}&file=shapes`)
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
  };

  const handlePlanTrip = async (tripData: TripPlanData) => {
    console.log('🚀 Trip planning initiated:', tripData);
    setIsSearching(true);
    setRouteCollisions([]);
    
    if (!tripData.fromStop || !tripData.toStop) {
      setIsSearching(false);
      return;
    }

    try {
      // Find routes connecting both stops
      const routeConnections = await findRouteBetweenStops(tripData.fromStop.id, tripData.toStop.id);

      // Set route data for visualization
      setSelectedRoutes(routeConnections);

      // Fetch real-time vehicles for these routes
      let vehicles: any[] = [];
      if (routeConnections.length > 0) {
        const routeIds = routeConnections.map(r => r.routeId);
        console.log('🚌 Fetching live vehicles for routes:', routeIds);
        vehicles = await fetchRealTimeVehicles(routeIds);
        setLiveVehicles(vehicles);
      } else {
        setLiveVehicles([]);
      }

      // Deploy visual markers on map
      const stopsToShow = [
        {
          id: tripData.fromStop.id,
          name: tripData.fromStop.name,
          lat: tripData.fromStop.lat,
          lng: tripData.fromStop.lng,
          type: 'origin',
          icon: '🟢', // Green for start
          routeConnections
        },
        {
          id: tripData.toStop.id,
          name: tripData.toStop.name,
          lat: tripData.toStop.lat,
          lng: tripData.toStop.lng,
          type: 'destination',
          icon: '🔴', // Red for end
          routeConnections
        }
      ];
      
      setSearchedStops(stopsToShow);
      
      // Check for route collisions with delays
      if (routeConnections.length > 0 && delays.length > 0) {
        // This collision detection will be handled by GoogleMapsComponent
        // We'll pass a callback to receive collision results
      }
      
      console.log('🗺️ Visual markers deployed:', stopsToShow);
      console.log('🚌 Route connections found:', routeConnections);
      console.log('🚍 Live vehicles found:', vehicles.length);
      
    } catch (error) {
      console.error('Error planning trip:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleReportIssue = (report: Report) => {
    console.log('Report submitted:', report);
  };

  const handleReportDifficulty = async (cause: string, vehicleNumber: string, location: { lat: number; lng: number }) => {
    console.log('Difficulty reported:', { cause, vehicleNumber, location });
    setSelectedIssueType(cause);
    setIsDifficultyDrawerOpen(false);
    setShowTripIssuesNotification(true);
    
    // Refresh delays to show the new report on the map
    await fetchDelays();
  };

  const handleRouteCollisions = (collisions: any[]) => {
    console.log('Route collisions detected:', collisions);
    if (collisions.length > 0) {
      setRouteCollisions(collisions);
      setShowTripIssuesNotification(true);
      // Set the issue type based on the first collision
      if (collisions[0]?.delay?.cause) {
        setSelectedIssueType(collisions[0].delay.cause);
      }
    }
  };

  return (
    <main className={styles.main}>
      {/* PRAWDZIWA GOOGLE MAPS ZAMIAST EMOJI! */}
      <div className={styles.mapBackground}>
        <GoogleMapsComponent
          stops={searchedStops} // Show searched route stops
          routes={selectedRoutes} // Show shape-based routes with geometry
          vehicles={liveVehicles} // Show real-time vehicle positions
          delays={delays} // Show delay reports from delays.json
          apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_API_KEY_HERE"}
          showStops={true}
          showRoutes={true} // Enable route visualization
          showVehicles={true} // Enable live vehicle tracking
          showDelays={delays.length > 0} // Enable delay report visualization only if delays exist
          onRouteCollisions={handleRouteCollisions} // Handle collision detection
        />
      </div>

      {/* Floating Content Overlay */}
      <div className={styles.overlay}>
        <div className={styles.container}>
          {/* Trip Planner na górze */}

          {/* Top components grouped together */}
          <div className="space-y-2">
            {/* User Panel */}
            <UserPanel 
              name="John Doe" 
              points={1250} 
            />
            
            {/* Trip Planner */}
            <div className={styles.floatingCard}>
              <TripPlanner onPlanTrip={handlePlanTrip} />
            </div>
          </div>
          
          {/* Spacer to push bottom buttons down */}
          <div className="flex-1"></div>
          
          {/* Bottom buttons group - Horizontal & Slim */}
          <div className={styles.floatingCard}>
            <div className="flex gap-2">
              <button
                onClick={() => setIsTripInfoOpen(true)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-1 active:bg-gray-300 text-sm"
              >
                <span>👀</span>
                <span>View Trip</span>
              </button>

              <button
                onClick={() => setIsDifficultyDrawerOpen(true)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-1 active:bg-red-700 text-sm"
              >
                <span>⚠️</span>
                <span>Report Issue</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <ReportDifficultyDrawer 
        isOpen={isDifficultyDrawerOpen}
        onClose={() => setIsDifficultyDrawerOpen(false)}
        onSubmit={handleReportDifficulty}
      />

      {showTripIssuesNotification && (
        <TripIssuesNotification 
          tripId={routeCollisions.length > 0 
            ? `Route ${routeCollisions[0]?.route?.routeShortName || 'Unknown'} - ${routeCollisions[0]?.route?.routeLongName || 'Transit Route'}`
            : "Line 23 - Downtown Route"
          }
          selectedIssueType={selectedIssueType}
          collisions={routeCollisions}
          onClose={() => {
            setShowTripIssuesNotification(false);
            setRouteCollisions([]);
          }}
        />
      )}

      {/* Trip Info Slide-out Panel */}
      <TripInfoPanel 
        isOpen={isTripInfoOpen}
        onClose={() => setIsTripInfoOpen(false)}
      />

    </main>
  );
}
