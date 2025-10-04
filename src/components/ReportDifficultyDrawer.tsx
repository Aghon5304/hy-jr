'use client';

import { useState, useEffect } from 'react';

interface ReportDifficultyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (cause: string, location: { lat: number; lng: number }) => void;
}

const difficultyOptions = [
  { value: 'delay', label: 'Vehicle Delay' },
  { value: 'breakdown', label: 'Vehicle Breakdown' },
  { value: 'overcrowding', label: 'Overcrowding' },
  { value: 'accessibility', label: 'Accessibility Issue' },
  { value: 'safety', label: 'Safety Concern' },
  { value: 'other', label: 'Other' }
];

export default function ReportDifficultyDrawer({ 
  isOpen, 
  onClose, 
  onSubmit 
}: ReportDifficultyDrawerProps) {
  const [selectedCause, setSelectedCause] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !location) {
      getCurrentLocation();
    }
  }, [isOpen, location]);

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    setLocationError(null);
    
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      setLocationError('Location not available on server side.');
      setLocation({
        lat: 40.7128,
        lng: -74.0060
      });
      setIsGettingLocation(false);
      return;
    }
    
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      setLocation({
        lat: 40.7128,
        lng: -74.0060
      });
      setIsGettingLocation(false);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationError(null);
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        let errorMessage = 'Unable to get location';
        
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            errorMessage = 'Location access denied. Please enable location permissions and try again.';
            break;
          case 2: // POSITION_UNAVAILABLE
            errorMessage = 'Location information is unavailable.';
            break;
          case 3: // TIMEOUT
            errorMessage = 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage = 'An unknown error occurred while retrieving location.';
            break;
        }
        
        setLocationError(errorMessage);
        // Fallback to a default location (e.g., city center)
        setLocation({
          lat: 40.7128, // Default to NYC coordinates
          lng: -74.0060
        });
        setIsGettingLocation(false);
      },
      options
    );
  };

  const handleSubmit = () => {
    if (selectedCause && location) {
      onSubmit(selectedCause, location);
      // Reset form
      setSelectedCause('');
      setLocation(null);
    }
  };

  const handleClose = () => {
    setSelectedCause('');
    setLocation(null);
    setLocationError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />
      
      {/* Drawer Content */}
      <div className="relative w-full bg-white rounded-t-2xl max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Report Difficulty</h2>
              <p className="text-sm text-gray-600">
                Help us improve transit by reporting issues you encounter
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              ✕
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="px-4 py-6">
          <div className="space-y-6">
            <div>
              <label className="text-base font-medium mb-3 block text-gray-900">
                What type of difficulty are you experiencing?
              </label>
              <div className="space-y-3">
                {difficultyOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id={option.value}
                      name="difficulty-cause"
                      value={option.value}
                      checked={selectedCause === option.value}
                      onChange={(e) => setSelectedCause(e.target.value)}
                      className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500 focus:ring-2"
                    />
                    <label htmlFor={option.value} className="text-sm font-medium text-gray-700">
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Location
              </label>
              {isGettingLocation ? (
                <p className="text-sm text-gray-500">Getting your location...</p>
              ) : location ? (
                <div>
                  <p className="text-sm text-gray-600">
                    📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  </p>
                  {locationError && (
                    <p className="text-xs text-orange-600 mt-1">
                      {locationError} (Using default location)
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-red-500">Unable to get location</p>
              )}
              {locationError && !location && (
                <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
                  <p className="text-xs text-orange-700">{locationError}</p>
                </div>
              )}
              <button
                onClick={getCurrentLocation}
                disabled={isGettingLocation}
                className="mt-3 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isGettingLocation ? 'Getting location...' : 'Refresh Location'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-4 py-4 space-y-3">
          <button
            onClick={handleSubmit}
            disabled={!selectedCause || !location}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Submit Report
          </button>
          <button
            onClick={handleClose}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}