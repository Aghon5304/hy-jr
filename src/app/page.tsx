'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import TripPlanner, { TripPlanData } from '@/components/TripPlanner';
import ReportIssueWidget from '@/components/ReportIssueWidget';
import GoogleMapsComponent from '@/components/GoogleMapsComponent';
import { Report } from '@/types/Report';
import { MapData } from '@/lib/gtfsMapService';

// Styling variables
const styles = {
  main: "min-h-screen bg-gray-50 p-4",
  container: "max-w-sm mx-auto",
  title: "text-2xl font-bold text-gray-900 mb-6 text-center",
  divider: {
    container: "flex items-center my-6",
    line: "flex-1 border-t border-gray-300",
    text: "px-4 text-sm text-gray-500"
  },
  viewTripButton: "w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-4 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2 active:bg-gray-300",
  viewTripIcon: "text-lg"
};

export default function Home() {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [googleMapsApiKey] = useState<string>('YOUR_GOOGLE_MAPS_API_KEY'); // Replace with actual API key

  useEffect(() => {
    // Load map data on component mount
    loadMapData();
  }, []);

  const loadMapData = async () => {
    try {
      const response = await fetch('/mapData?sources=krakow1');
      const data = await response.json();
      
      if (response.ok) {
        setMapData(data);
      }
    } catch (err) {
      console.error('Failed to load map data:', err);
    }
  };

  const handlePlanTrip = (tripData: TripPlanData) => {
    console.log('Planning trip:', tripData);
    // Here you would typically:
    // 1. Validate the data
    // 2. Make API calls to search for routes
    // 3. Navigate to results page or show loading state
    alert(`Searching routes from ${tripData.from} to ${tripData.to} on ${tripData.date} at ${tripData.time}`);
  };

  const handleReportIssue = (report: Report) => {
    console.log('Report submitted:', report);
    alert(`Issue reported: ${report.reporterLocation === 'on_vehicle' ? 'On vehicle' : 'At stop'}`);
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <TripPlanner onPlanTrip={handlePlanTrip} />
        
        {/* Google Maps Component */}
        <div className="h-[30vh] rounded-2xl shadow-lg my-6 overflow-hidden">
          {mapData ? (
            <GoogleMapsComponent
              stops={mapData.stops}
              routes={mapData.routes}
              vehicles={mapData.vehicles}
              bounds={mapData.bounds}
              apiKey={googleMapsApiKey}
              showStops={true}
              showRoutes={false}
              showVehicles={true}
              onStopClick={(stop) => console.log('Stop clicked:', stop)}
              onRouteClick={(route) => console.log('Route clicked:', route)}
            />
          ) : (
            <div className="h-full bg-green-100 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-2">🗺️</div>
                <div className="text-sm text-green-700 font-medium">Loading Map...</div>
                <div className="text-xs text-green-600">Please wait</div>
              </div>
            </div>
          )}
        </div>
        
        <Link 
          href="/TripInfo"
          className={styles.viewTripButton}
        >
          <span className={styles.viewTripIcon}>👀</span>
          <span>View Current Trip</span>
        </Link>

        <div className="mt-6">
          <ReportIssueWidget onSubmitReport={handleReportIssue} />
        </div>
      </div>
    </main>
  );
}
