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
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
        🗺️ Plan Your Trip
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* From Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            From
          </label>
          <input
            type="text"
            value={tripData.from}
            onChange={(e) => handleInputChange('from', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter departure station"
            required
          />
        </div>

        {/* To Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Where
          </label>
          <input
            type="text"
            value={tripData.to}
            onChange={(e) => handleInputChange('to', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter destination station"
            required
          />
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={tripData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time
            </label>
            <input
              type="time"
              value={tripData.time}
              onChange={(e) => handleInputChange('time', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        {/* Transport Mode Checkboxes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Transport Options
          </label>
          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={tripData.transportModes.bus}
                onChange={() => handleTransportModeChange('bus')}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="flex items-center space-x-2">
                <span className="text-lg">🚌</span>
                <span className="text-sm font-medium text-gray-700">Bus</span>
              </span>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={tripData.transportModes.train}
                onChange={() => handleTransportModeChange('train')}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="flex items-center space-x-2">
                <span className="text-lg">🚂</span>
                <span className="text-sm font-medium text-gray-700">Train</span>
              </span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!tripData.from || !tripData.to || (!tripData.transportModes.bus && !tripData.transportModes.train)}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-4 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2 active:bg-blue-800"
        >
          <span className="text-lg">🔍</span>
          <span>Search Routes</span>
        </button>
      </form>

      {/* Quick Suggestions */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Options</h3>
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={() => {
              setTripData(prev => ({ ...prev, from: 'Central Station', to: 'Airport Terminal' }));
            }}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg transition-colors"
          >
            Central → Airport
          </button>
          <button 
            onClick={() => {
              setTripData(prev => ({ ...prev, from: 'Main Square', to: 'University' }));
            }}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg transition-colors"
          >
            Square → University
          </button>
        </div>
      </div>
    </div>
  );
}