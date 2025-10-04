'use client';

import { useState } from 'react';

interface TripPlannerProps {
  onPlanTrip?: (tripData: TripPlanData) => void;
}

export interface TripPlanData {
  from: string;
  to: string;
  date: string;
  time: string;
  transportModes: {
    bus: boolean;
    train: boolean;
  };
}

export default function TripPlanner({ onPlanTrip }: TripPlannerProps) {
  const [tripData, setTripData] = useState<TripPlanData>({
    from: '',
    to: '',
    date: new Date().toISOString().split('T')[0], // Today's date
    time: new Date().toTimeString().slice(0, 5), // Current time
    transportModes: {
      bus: true,
      train: true,
    }
  });

  const handleInputChange = (field: keyof TripPlanData, value: string) => {
    setTripData(prev => ({
      ...prev,
      [field]: value
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
    if (onPlanTrip) {
      onPlanTrip(tripData);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">
        🗺️ Plan Your Trip
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* From and To Fields */}
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={tripData.from}
            onChange={(e) => handleInputChange('from', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="From"
            required
          />
          <input
            type="text"
            value={tripData.to}
            onChange={(e) => handleInputChange('to', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="To"
            required
          />
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={tripData.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <input
            type="time"
            value={tripData.time}
            onChange={(e) => handleInputChange('time', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Transport Mode Checkboxes - Inline */}
        <div className="flex items-center justify-center space-x-6">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={tripData.transportModes.bus}
              onChange={() => handleTransportModeChange('bus')}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm">🚌 Bus</span>
          </label>
          
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={tripData.transportModes.train}
              onChange={() => handleTransportModeChange('train')}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm">🚂 Train</span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!tripData.from || !tripData.to || (!tripData.transportModes.bus && !tripData.transportModes.train)}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 active:bg-blue-800"
        >
          <span>🔍</span>
          <span className="text-sm">Search Routes</span>
        </button>

        {/* Quick Suggestions - Compact */}
        <div className="flex space-x-2">
          <button 
            type="button"
            onClick={() => {
              setTripData(prev => ({ ...prev, from: 'Central Station', to: 'Airport Terminal' }));
            }}
            className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 px-2 rounded-md transition-colors"
          >
            Central → Airport
          </button>
          <button 
            type="button"
            onClick={() => {
              setTripData(prev => ({ ...prev, from: 'Main Square', to: 'University' }));
            }}
            className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 px-2 rounded-md transition-colors"
          >
            Square → University
          </button>
        </div>
      </form>
    </div>
  );
}