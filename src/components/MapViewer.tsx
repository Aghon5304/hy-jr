'use client';

import { useState, useEffect } from 'react';
import GoogleMapsComponent from '@/components/GoogleMapsComponent';
import { MapData } from '@/lib/gtfsMapService';

interface MapViewerProps {
  height?: string;
}

export default function MapViewer({ height = "h-[30vh]" }: MapViewerProps) {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [googleMapsApiKey] = useState<string>('apikey'); // Replace with actual API key

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

  return (
    <div className={`${height} rounded-2xl shadow-lg overflow-hidden`}>
      {mapData ? (
        <GoogleMapsComponent
          stops={mapData.stops || []}
          routes={mapData.routes || []}
          vehicles={mapData.vehicles || []}
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
  );
}