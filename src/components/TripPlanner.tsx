'use client';

import { useState, useEffect } from 'react';
import StopSearchInput from './StopSearchInput';
import { MappedStop } from '@/lib/gtfsMapService';

interface TripPlannerProps {
  onPlanTrip: (tripData: TripPlanData) => void;
  isSearching?: boolean;
}

export interface TripPlanData {
  from: string;
  to: string;
  fromStop?: MappedStop;
  toStop?: MappedStop;
  // date: string;
  // time: string;
  transportModes: {
    bus: boolean;
    train: boolean;
  };
}

export default function TripPlanner({ onPlanTrip, isSearching }: TripPlannerProps) {
  const [stops, setStops] = useState<MappedStop[]>([]);
  const [isLoadingStops, setIsLoadingStops] = useState(false);
  
  const [tripData, setTripData] = useState<TripPlanData>({
    from: '',
    to: '',
    fromStop: undefined,
    toStop: undefined,
    // date: new Date().toISOString().split('T')[0], // Today's date
    // time: new Date().toTimeString().slice(0, 5), // Current time
    transportModes: {
      bus: true,
      train: true,
    }
  });

  // Fetch stops once for both inputs
  useEffect(() => {
    const fetchStops = async () => {
      setIsLoadingStops(true);
      try {
        const sources = ['krakow1', 'krakow2', 'krakow3', 'ald', 'kml'];
        const allStops: MappedStop[] = [];

        for (const source of sources) {
          try {
            console.log(`TripPlanner: Fetching stops from ${source}...`);
            const response = await fetch(`/api/gtfsStatic?file=stops&source=${source}`);
            if (response.ok) {
              const responseData = await response.json();
              const data = responseData.data;
              console.log(`TripPlanner: Got ${data?.length || 0} stops from ${source}`);
              
              const mappedStops: MappedStop[] = data?.map((stop: any) => ({
                id: stop.stop_id,
                name: stop.stop_name,
                lat: parseFloat(stop.stop_lat),
                lng: parseFloat(stop.stop_lon),
                code: stop.stop_code,
                zone: stop.zone_id,
                routes: [],
                sourceId: source
              })) || [];
              allStops.push(...mappedStops);
            }
          } catch (error) {
            console.warn(`TripPlanner: Failed to fetch stops from ${source}:`, error);
          }
        }

        // Remove duplicates
        const uniqueStops = allStops.filter((stop, index, self) => 
          index === self.findIndex((s) => 
            s.name === stop.name && 
            Math.abs(s.lat - stop.lat) < 0.0001 && 
            Math.abs(s.lng - stop.lng) < 0.0001
          )
        );

        console.log(`TripPlanner: Total unique stops: ${uniqueStops.length}`);
        setStops(uniqueStops);
      } catch (error) {
        console.error('TripPlanner: Error fetching stops:', error);
      } finally {
        setIsLoadingStops(false);
      }
    };

    fetchStops();
  }, []);

  const handleStopChange = (field: 'from' | 'to', value: string, stop?: MappedStop) => {
    setTripData(prev => ({
      ...prev,
      [field]: value,
      [`${field}Stop`]: stop
    }));
  };

  const handleTransportModeChange = (mode: 'bus' | 'train') => {
    setTripData(prev => ({
      ...prev,
      transportModes: {
        ...prev.transportModes,
        [mode]: !prev.transportModes[mode]
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation passed - button is now functional
    console.log('🔍 Route search initiated!', {
      from: tripData.from,
      to: tripData.to,
      fromStop: tripData.fromStop,
      toStop: tripData.toStop
    });
    
    // Show user feedback
    
    if (onPlanTrip) {
      onPlanTrip(tripData);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4">
      
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* From Field - Full Width */}
        <StopSearchInput
          id="from-stop"
          value={tripData.from}
          onChange={(value, stop) => handleStopChange('from', value, stop)}
          placeholder="Skąd"
          stops={stops}
          isLoading={isLoadingStops}
        />

        {/* To Field and Submit Button */}
        <div className="flex gap-2">
          <StopSearchInput
            id="to-stop"
            value={tripData.to}
            onChange={(value, stop) => handleStopChange('to', value, stop)}
            placeholder="Dokąd"
            stops={stops}
            isLoading={isLoadingStops}
          />
          <button
            type="submit"
            disabled={!tripData.fromStop || !tripData.toStop || isSearching}
            className="w-1/5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center active:bg-blue-800"
          >
            <span>🔍</span>
          </button>
        </div>
      </form>
    </div>
  );
}