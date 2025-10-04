'use client';

import { useState, useEffect, useRef } from 'react';
import { MappedStop } from '@/lib/gtfsMapService';

interface StopSearchInputProps {
  value: string;
  onChange: (value: string, stop?: MappedStop) => void;
  placeholder: string;
  id: string;
  stops?: MappedStop[]; // Optional: if provided, won't fetch stops
  isLoading?: boolean; // Optional: external loading state
}

export default function StopSearchInput({ value, onChange, placeholder, id, stops: externalStops, isLoading: externalIsLoading }: StopSearchInputProps) {
  const [internalStops, setInternalStops] = useState<MappedStop[]>([]);
  const [filteredStops, setFilteredStops] = useState<MappedStop[]>([]);
  const [internalIsLoading, setInternalIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStop, setSelectedStop] = useState<MappedStop | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Use external stops if provided, otherwise fetch internally
  const stops = externalStops || internalStops;
  const isLoading = externalIsLoading || internalIsLoading;

  // Fetch stops on component mount (only if external stops not provided)
  useEffect(() => {
    if (externalStops) return; // Skip if external stops provided
    const fetchStops = async () => {
      setInternalIsLoading(true);
      try {
        // Try all available sources
        const sources = ['krakow1', 'krakow2', 'krakow3', 'ald', 'kml'];
        const allStops: MappedStop[] = [];

        for (const source of sources) {
          try {
            console.log(`Fetching stops from ${source}...`);
            const response = await fetch(`/api/gtfsStatic?file=stops&source=${source}`);
            console.log(`Response for ${source}:`, response.status, response.ok);
            if (response.ok) {
              const responseData = await response.json();
              const data = responseData.data; // API returns {data: [...], source: ..., count: ...}
              console.log(`Got ${data?.length || 0} stops from ${source}`);
              // Map GTFS stops to MappedStop format
              const mappedStops: MappedStop[] = data?.map((stop: any) => ({
                id: stop.stop_id,
                name: stop.stop_name,
                lat: parseFloat(stop.stop_lat),
                lng: parseFloat(stop.stop_lon),
                code: stop.stop_code,
                zone: stop.zone_id,
                routes: [], // Will be populated later if needed
                sourceId: source
              })) || [];
              allStops.push(...mappedStops);
            }
          } catch (error) {
            console.warn(`Failed to fetch stops from ${source}:`, error);
          }
        }

        // Remove duplicates based on name and coordinates
        const uniqueStops = allStops.filter((stop, index, self) => 
          index === self.findIndex((s) => 
            s.name === stop.name && 
            Math.abs(s.lat - stop.lat) < 0.0001 && 
            Math.abs(s.lng - stop.lng) < 0.0001
          )
        );

        console.log(`Total unique stops: ${uniqueStops.length}`);
        setInternalStops(uniqueStops);
      } catch (error) {
        console.error('Error fetching stops:', error);
      } finally {
        setInternalIsLoading(false);
      }
    };

    fetchStops();
  }, [externalStops]);

  // Filter stops based on input value
  useEffect(() => {
    console.log('Filter effect triggered:', { value, stopsCount: stops.length });
    if (!value || value.length < 2) {
      setFilteredStops([]);
      setShowDropdown(false);
      return;
    }

    const filtered = stops
      .filter(stop => 
        stop.name.toLowerCase().includes(value.toLowerCase()) ||
        (stop.code && stop.code.toLowerCase().includes(value.toLowerCase()))
      )
      .slice(0, 10); // Limit to 10 results

    console.log('Filtered stops:', filtered.length);
    setFilteredStops(filtered);
    setShowDropdown(filtered.length > 0);
  }, [value, stops]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log('Input changed:', newValue);
    onChange(newValue);
    setSelectedStop(null);
  };

  const handleStopSelect = (stop: MappedStop) => {
    setSelectedStop(stop);
    onChange(stop.name, stop);
    setShowDropdown(false);
    inputRef.current?.blur();
  };

  const handleInputFocus = () => {
    if (filteredStops.length > 0) {
      setShowDropdown(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding dropdown to allow for clicks
    setTimeout(() => setShowDropdown(false), 200);
  };

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={isLoading ? 'Loading stops...' : placeholder}
        disabled={isLoading}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredStops.map((stop) => (
            <div
              key={`${stop.sourceId}-${stop.id}`}
              onClick={() => handleStopSelect(stop)}
              className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-sm text-gray-900">{stop.name}</div>
              {stop.code && (
                <div className="text-xs text-gray-500">Code: {stop.code}</div>
              )}
              <div className="text-xs text-gray-400">
                {stop.sourceId} • {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
              </div>
            </div>
          ))}
          
          {filteredStops.length === 0 && value.length >= 2 && !isLoading && (
            <div className="px-3 py-2 text-sm text-gray-500">
              No stops found matching "{value}"
            </div>
          )}
          
          {isLoading && value.length >= 2 && (
            <div className="px-3 py-2 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span>Loading stops...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}