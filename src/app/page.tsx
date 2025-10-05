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
import { 
  saveJourney, 
  getSavedJourneys, 
  getActiveJourney, 
  checkJourneyCollisions,
  type SavedJourney 
} from '@/lib/journeyManager';

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
  const [searchedStops, setSearchedStops] = useState<any[]>([]);
  const [liveVehicles, setLiveVehicles] = useState<any[]>([]);
  const [selectedRoutes, setSelectedRoutes] = useState<any[]>([]);
  const [delays, setDelays] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [routeCollisions, setRouteCollisions] = useState<any[]>([]);
  const [savedJourney, setSavedJourney] = useState<SavedJourney | null>(null);
  const [showSaveButton, setShowSaveButton] = useState(false);
  const [currentTripData, setCurrentTripData] = useState<TripPlanData | null>(null);
  const [showTripInfoPanel, setShowTripInfoPanel] = useState(false);

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
        
        // Check saved journey for collisions with new delays
        if (savedJourney && delayReports.length > 0) {
          const journeyCollisions = checkJourneyCollisions(savedJourney, delayReports);
          if (journeyCollisions.length > 0) {
            console.log('🚨 Saved journey has collisions with new delays:', journeyCollisions);
            setRouteCollisions(journeyCollisions);
            setShowTripIssuesNotification(true);
            if (journeyCollisions[0]?.delay?.cause) {
              setSelectedIssueType(journeyCollisions[0].delay.cause);
            }
          }
        }
        
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
    loadSavedJourney();
  }, []);

  // Load saved journey on mount
  const loadSavedJourney = () => {
    const activeJourney = getActiveJourney();
    if (activeJourney) {
      setSavedJourney(activeJourney);
      // Restore the journey visualization
      setSelectedRoutes(activeJourney.routeConnections);
      
      const stopsToShow = [
        {
          ...activeJourney.fromStop,
          type: 'origin',
          icon: '🟢',
          routeConnections: activeJourney.routeConnections
        },
        {
          ...activeJourney.toStop,
          type: 'destination',
          icon: '🔴',
          routeConnections: activeJourney.routeConnections
        }
      ];
      setSearchedStops(stopsToShow);
      
      console.log('🔄 Loaded saved journey:', activeJourney);
    }
  };

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

  // Function to find routes using the new API endpoint
  const findRouteBetweenStops = async (stopId1: string, stopId2: string) => {
    try {
      console.log('� Using API to find routes between stops:', stopId1, 'and', stopId2);
      
      const response = await fetch(`/api/findRoute?from=${encodeURIComponent(stopId1)}&to=${encodeURIComponent(stopId2)}`);
      
      if (!response.ok) {
        console.error('❌ API request failed:', response.status, response.statusText);
        return [];
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ API returned route connections:', data.count);
        return data.data || [];
      } else {
        console.error('❌ API returned error:', data.error);
        return [];
      }
      
    } catch (error) {
      console.error('💥 Error calling findRoute API:', error);
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
        const routeIds = routeConnections.map((r: any) => r.routeId);
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
      
      // Store current trip data for saving
      setCurrentTripData(tripData);
      setShowSaveButton(routeConnections.length > 0);
      
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

  const handleSaveJourney = () => {
    if (currentTripData && selectedRoutes.length > 0) {
      const journey = saveJourney(
        currentTripData.fromStop,
        currentTripData.toStop,
        selectedRoutes
      );
      setSavedJourney(journey);
      setShowSaveButton(false);
      
      // Auto-hide the saved journey notification after 3 seconds
      setTimeout(() => {
        setSavedJourney(prev => prev ? { ...prev, showNotification: false } : null);
      }, 3000);
      
      console.log('💾 Journey saved successfully');
    }
  };

  const handleJourneyDeleted = () => {
    // Clear all journey-related state
    setSavedJourney(null);
    setSelectedRoutes([]);
    setSearchedStops([]);
    setLiveVehicles([]);
    console.log('🗑️ Journey deleted and cleared from map');
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
                onClick={() => setShowTripInfoPanel(true)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-1 active:bg-gray-300 text-sm"
              >
                <span>👀</span>
                <span>Zobacz podróż</span>
              </button>

              <button
                onClick={() => setIsDifficultyDrawerOpen(true)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-1 active:bg-red-700 text-sm"
              >
                <span>⚠️</span>
                <span>Zgłoś problem</span>
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
        isOpen={showTripInfoPanel}
        onClose={() => setShowTripInfoPanel(false)}
        savedJourney={savedJourney}
      />

    </main>
  );
}
