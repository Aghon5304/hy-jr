'use client';

import { useState, useEffect } from 'react';

interface ReportDifficultyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (cause: string, vehicleNumber: string, location: { lat: number; lng: number }) => void;
}

const difficultyOptions = [
  { value: 'delays', label: 'Opóźnienia', icon: '🕐' },
  { value: 'route-difficulties', label: 'Utrudnienia na trasie', icon: '🚧' },
  { value: 'no-vehicle', label: 'Brak pojazdu', icon: '❌' },
  { value: 'route-change', label: 'Zmiana trasy', icon: '↩️' },
  { value: 'accessibility', label: 'Problemy z dostępnością', icon: '♿' },
  { value: 'breakdown', label: 'Awaria pojazdu', icon: '⚠️' },
  { value: 'overcrowding', label: 'Tłok/Przepełnienie', icon: '👥' },
  { value: 'ticket-control', label: 'Kontrola biletów', icon: '🎫' }
];

export default function ReportDifficultyDrawer({ 
  isOpen, 
  onClose, 
  onSubmit 
}: ReportDifficultyDrawerProps) {
  const [selectedCause, setSelectedCause] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
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
      setLocationError('Lokalizacja niedostępna po stronie serwera.');
      setLocation({
        lat: 40.7128,
        lng: -74.0060
      });
      setIsGettingLocation(false);
      return;
    }
    
    if (!navigator.geolocation) {
      setLocationError('Geolokalizacja nie jest obsługiwana przez tę przeglądarkę.');
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
        let errorMessage = 'Nie można pobrać lokalizacji';
        
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            errorMessage = 'Dostęp do lokalizacji został odrzucony. Proszę włączyć uprawnienia lokalizacji i spróbować ponownie.';
            break;
          case 2: // POSITION_UNAVAILABLE
            errorMessage = 'Informacje o lokalizacji są niedostępne.';
            break;
          case 3: // TIMEOUT
            errorMessage = 'Żądanie lokalizacji przekroczyło czas oczekiwania. Proszę spróbować ponownie.';
            break;
          default:
            errorMessage = 'Wystąpił nieznany błąd podczas pobierania lokalizacji.';
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

  const handleSubmit = async (cause: string) => {
    if (location) {
      try {
        // Save to delays.json via API
        const response = await fetch('/api/delays', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cause,
            vehicleNumber,
            location
          }),
        });

        if (response.ok) {
          console.log('Delay report saved successfully');
        } else {
          console.error('Failed to save delay report');
        }
      } catch (error) {
        console.error('Error submitting delay report:', error);
      }

      // Call original onSubmit callback
      onSubmit(cause, vehicleNumber, location);
      
      // Reset form
      setSelectedCause('');
      setVehicleNumber('');
      setLocation(null);
    }
  };

  const handleClose = () => {
    setSelectedCause('');
    setVehicleNumber('');
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
              <h2 className="text-lg font-semibold text-gray-900">Zgłoś Problem</h2>
              <p className="text-sm text-gray-600">
                Pomóż nam poprawić transport publiczny, zgłaszając napotykane problemy
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
            {/* Vehicle Number Input */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Numer pojazdu (opcjonalnie)
              </label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="np. 1234"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-base font-medium mb-3 block text-gray-900">
                Jaki rodzaj problemu napotykasz?
              </label>
              <div className="grid grid-cols-2 gap-3">
                {difficultyOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSubmit(option.value)}
                    disabled={!location}
                    className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-2xl mb-2">{option.icon}</span>
                    <span className="text-xs text-center font-medium text-gray-700">
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Lokalizacja
              </label>
              {isGettingLocation ? (
                <p className="text-sm text-gray-500">Pobieranie lokalizacji...</p>
              ) : location ? (
                <div>
                  <p className="text-sm text-gray-600">
                    📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  </p>
                  {locationError && (
                    <p className="text-xs text-orange-600 mt-1">
                      {locationError} (Używam domyślnej lokalizacji)
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-red-500">Nie można pobrać lokalizacji</p>
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
                {isGettingLocation ? 'Pobieranie lokalizacji...' : 'Odśwież lokalizację'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-4 py-4 space-y-3">
          <button
            onClick={handleClose}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Anuluj
          </button>
        </div>
      </div>
    </div>
  );
}