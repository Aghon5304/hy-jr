'use client';

import { useState } from 'react';
import TripPlanner, { TripPlanData } from '@/components/TripPlanner';
import ReportIssueWidget from '@/components/ReportIssueWidget';
import { Report } from '@/types/Report';
import ReportDifficultyDrawer from '@/components/ReportDifficultyDrawer';
import GoogleMapsComponent from '@/components/GoogleMapsComponent'; // DODANY IMPORT
import TripIssuesNotification from '@/components/TripIssuesNotification';
import TripInfoPanel from '@/components/TripInfoPanel';

// Styling variables
const styles = {
  main: "relative h-screen overflow-hidden",
  mapBackground: "absolute inset-0", // USUNIĘTE bg-green-100 flex items-center justify-center
  overlay: "relative z-10 p-4 h-screen pointer-events-none",
  container: "max-w-sm mx-auto h-full flex flex-col justify-between py-8",
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

  // Function to find routes that connect two stops
  const findRouteBetweenStops = async (stopId1: string, stopId2: string) => {
    console.log('🔍 ROUTE FINDER INITIATED');
    console.log('🎯 Target stops:', stopId1, 'and', stopId2);
    
    try {
      // Get stop_times data from all sources
      const sources = ['krakow1', 'krakow2', 'krakow3', 'ald', 'kml'];
      const routeConnections: any[] = [];
      
      for (const source of sources) {
        console.log(`📡 Checking source: ${source}`);
        try {
          // Fetch stop_times data
          const stopTimesResponse = await fetch(`/api/gtfsStatic?source=${source}&file=stopTimes`);
          if (!stopTimesResponse.ok) {
            console.log(`❌ Failed to fetch stopTimes from ${source}`);
            continue;
          }
          
          const stopTimesData = await stopTimesResponse.json();
          const stopTimes = stopTimesData.data || [];
          console.log(`📊 ${source}: Loaded ${stopTimes.length} stop_times records`);
          
          // Find trips that visit both stops
          const tripsWithStop1 = stopTimes.filter((st: any) => st.stop_id === stopId1);
          const tripsWithStop2 = stopTimes.filter((st: any) => st.stop_id === stopId2);
          
          console.log(`🚏 ${source}: Stop1 (${stopId1}) appears in ${tripsWithStop1.length} trips`);
          console.log(`🚏 ${source}: Stop2 (${stopId2}) appears in ${tripsWithStop2.length} trips`);
          
          // Find common trips
          const commonTrips = tripsWithStop1.filter((st1: any) => 
            tripsWithStop2.some((st2: any) => st2.trip_id === st1.trip_id)
          );
          
          console.log(`🔗 ${source}: Found ${commonTrips.length} common trips`);
          
          if (commonTrips.length > 0) {
            console.log(`🚌 ${source}: Common trip IDs:`, commonTrips.map((t: any) => t.trip_id).slice(0, 5));
            
            // Get route information for these trips
            const tripsResponse = await fetch(`/api/gtfsStatic?source=${source}&file=trips`);
            if (tripsResponse.ok) {
              const tripsData = await tripsResponse.json();
              const trips = tripsData.data || [];
              console.log(`📋 ${source}: Loaded ${trips.length} trip records`);
              
              const routesResponse = await fetch(`/api/gtfsStatic?source=${source}&file=routes`);
              if (routesResponse.ok) {
                const routesData = await routesResponse.json();
                const routes = routesData.data || [];
                console.log(`🗺️ ${source}: Loaded ${routes.length} route records`);
                
                commonTrips.forEach((trip: any) => {
                  const tripInfo = trips.find((t: any) => t.trip_id === trip.trip_id);
                  if (tripInfo) {
                    const routeInfo = routes.find((r: any) => r.route_id === tripInfo.route_id);
                    if (routeInfo) {
                      const existingRoute = routeConnections.find(rc => rc.routeId === routeInfo.route_id);
                      if (!existingRoute) {
                        console.log(`✅ ${source}: Found new route connection:`, {
                          routeId: routeInfo.route_id,
                          shortName: routeInfo.route_short_name,
                          longName: routeInfo.route_long_name,
                          tripId: trip.trip_id
                        });
                        routeConnections.push({
                          routeId: routeInfo.route_id,
                          routeShortName: routeInfo.route_short_name,
                          routeLongName: routeInfo.route_long_name,
                          source: source,
                          tripId: trip.trip_id
                        });
                      } else {
                        console.log(`🔄 ${source}: Route already found:`, routeInfo.route_short_name);
                      }
                    } else {
                      console.log(`❓ ${source}: Route info not found for route_id:`, tripInfo.route_id);
                    }
                  } else {
                    console.log(`❓ ${source}: Trip info not found for trip_id:`, trip.trip_id);
                  }
                });
              } else {
                console.log(`❌ ${source}: Failed to fetch routes`);
              }
            } else {
              console.log(`❌ ${source}: Failed to fetch trips`);
            }
          } else {
            console.log(`⚫ ${source}: No common trips found`);
          }
        } catch (sourceError) {
          console.error(`💥 Error checking source ${source}:`, sourceError);
        }
        console.log(`---`);
      }
      
      console.log('🎯 FINAL RESULTS:');
      console.log(`📊 Total route connections found: ${routeConnections.length}`);
      routeConnections.forEach((connection, index) => {
        console.log(`${index + 1}. Route ${connection.routeShortName} (${connection.routeId}) from ${connection.source}`);
      });
      
      return routeConnections;
      
    } catch (error) {
      console.error('💥 Critical error in route finder:', error);
      return [];
    }
  };

  const handlePlanTrip = async (tripData: TripPlanData) => {
    console.log('🚀 Trip planning initiated:', tripData);
    
    if (!tripData.fromStop || !tripData.toStop) {
      alert('Mission failed: Select valid stops from dropdown');
      return;
    }

    // Find routes connecting both stops
    const routeConnections = await findRouteBetweenStops(tripData.fromStop.id, tripData.toStop.id);

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
    
    console.log('Visual markers deployed:', stopsToShow);
    console.log('Route connections found:', routeConnections);
    
    if (routeConnections.length > 0) {
      const routeNames = routeConnections.map(r => r.routeShortName || r.routeId).join(', ');
      alert(`🎯 DIRECT ROUTE FOUND!\n\n🟢 Origin: ${tripData.fromStop.name}\n🔴 Destination: ${tripData.toStop.name}\n🚌 Routes: ${routeNames}\n\nCheck the map for route visualization!`);
    } else {
      alert(`🚨 NO DIRECT ROUTE\n\n🟢 Origin: ${tripData.fromStop.name}\n🔴 Destination: ${tripData.toStop.name}\n\nThese stops are not connected by a direct bus route. Transfer required!`);
    }
  };

  const handleReportIssue = (report: Report) => {
    console.log('Report submitted:', report);
    alert(`Issue reported: ${report.reporterLocation === 'on_vehicle' ? 'On vehicle' : 'At stop'}`);
  };

  const handleReportDifficulty = (cause: string, location: { lat: number; lng: number }) => {
    console.log('Difficulty reported:', { cause, location });
    // Here you would save to database
    setSelectedIssueType(cause);
    setIsDifficultyDrawerOpen(false);
    setShowTripIssuesNotification(true);
  };

  return (
    <main className={styles.main}>
      {/* PRAWDZIWA GOOGLE MAPS ZAMIAST EMOJI! */}
      <div className={styles.mapBackground}>
        <GoogleMapsComponent
          stops={searchedStops} // Show searched route stops
          routes={[]}
          vehicles={[]}
          apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_API_KEY_HERE"}
          showStops={true}
          showRoutes={false}
          showVehicles={true}
        />
      </div>

      {/* Floating Content Overlay */}
      <div className={styles.overlay}>
        <div className={styles.container}>
          {/* Trip Planner na górze */}
          <div className={styles.floatingCard}>
            <TripPlanner onPlanTrip={handlePlanTrip} />
          </div>
          
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
          tripId="Line 23 - Downtown Route"
          selectedIssueType={selectedIssueType}
          onClose={() => setShowTripIssuesNotification(false)}
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
