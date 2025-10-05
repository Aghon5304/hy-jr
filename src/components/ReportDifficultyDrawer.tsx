'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

// Constant coordinates - always use this location
const CONSTANT_LOCATION = {
  lat: 50.054162997202276,
  lng: 19.935379028320312
};

interface ReportDifficultyDrawerProps {
  isOpen: boolean;
  isMinimized?: boolean;
  onClose: () => void;
  onSubmit: (cause: string, vehicleNumber: string, location: { lat: number; lng: number }) => void;
  onSelectLocationOnMap?: () => void;
  onUseCurrentLocation?: () => void;
  selectedMapLocation?: { lat: number; lng: number } | null;
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

const ReportDifficultyDrawer = forwardRef<
  { toggleVisibility: () => void },
  ReportDifficultyDrawerProps
>(({ 
  isOpen, 
  isMinimized = false,
  onClose, 
  onSubmit,
  onSelectLocationOnMap,
  onUseCurrentLocation,
  selectedMapLocation
}, ref) => {
  const [selectedCause, setSelectedCause] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  // Always use constant location
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(CONSTANT_LOCATION);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  // Internal state for controlling visibility
  const [isVisible, setIsVisible] = useState(false);
  
  // Debug: Log when isVisible changes
  useEffect(() => {
    console.log('🎨 Drawer isVisible state changed to:', isVisible);
  }, [isVisible]);
  
  // Expose visibility control functions to parent via ref
  useImperativeHandle(ref, () => ({
    toggleVisibility: () => {
      console.log('🎯 Drawer: toggleVisibility called, current state:', isVisible);
      setIsVisible(prev => !prev);
    },
    setMinimized: (minimized: boolean) => {
      console.log('🎯 Drawer: setMinimized called with:', minimized);
      // When minimized=true, hide the drawer (isVisible=false)
      // When minimized=false, show the drawer (isVisible=true)
      const newVisibility = !minimized;
      console.log('🎯 Drawer: Setting isVisible to:', newVisibility);
      setIsVisible(newVisibility);
      
      if (newVisibility) {
        console.log('✅ Drawer: NOW VISIBLE - Drawer restored to full view');
      } else {
        console.log('🔽 Drawer: NOW HIDDEN - Drawer minimized for map selection');
      }
    }
  }));

  useEffect(() => {
    console.log('🔄 Drawer useEffect triggered - isOpen:', isOpen);
    // When drawer is opened, set isVisible to true
    if (isOpen) {
      console.log('✅ Setting isVisible to TRUE because isOpen is true');
      setIsVisible(true);
      // Always set to constant location
      setLocation(CONSTANT_LOCATION);
    } else {
      console.log('❌ Setting isVisible to FALSE because isOpen is false');
      setIsVisible(false);
    }
  }, [isOpen]);

  // Sync with selected map location (but still fall back to constant location)
  useEffect(() => {
    if (selectedMapLocation) {
      setLocation(selectedMapLocation);
      setLocationError(null);
      setIsGettingLocation(false);
    } else {
      // Always ensure constant location is set
      setLocation(CONSTANT_LOCATION);
    }
  }, [selectedMapLocation]);

  const handleSubmit = async (cause: string) => {
    // Always use constant location
    const finalLocation = CONSTANT_LOCATION;
    
    if (finalLocation) {
      try {
        console.log('🚨 Submitting delay report with location:', finalLocation);
        
        // Save to delays.json via API
        const response = await fetch('/api/delays', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cause,
            vehicleNumber,
            location: finalLocation
          }),
        });

        if (response.ok) {
          console.log('✅ Delay report saved successfully to delays.json');
        } else {
          console.error('❌ Failed to save delay report');
        }
      } catch (error) {
        console.error('💥 Error submitting delay report:', error);
      }

      // Call original onSubmit callback with the final location
      onSubmit(cause, vehicleNumber, finalLocation);
      
      // Reset form
      setSelectedCause('');
      setVehicleNumber('');
      setLocation(CONSTANT_LOCATION);
    } else {
      console.warn('⚠️ No location available for report submission');
    }
  };

  const handleClose = () => {
    setSelectedCause('');
    setVehicleNumber('');
    setLocation(CONSTANT_LOCATION);
    setLocationError(null);
    onClose();
  };

  console.log('🎬 Drawer render - isOpen:', isOpen, 'isVisible:', isVisible);
  
  if (!isOpen) {
    console.log('❌ Drawer NOT rendering: isOpen is false');
    return null;
  }

  // Hide drawer when isVisible is false (during location selection)
  if (!isVisible) {
    console.log('❌ Drawer NOT rendering: isVisible is false (hidden for map selection)');
    return null;
  }

  console.log('✅ Drawer IS rendering: Both isOpen and isVisible are true');
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
            {/* Location Section - moved to top */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="text-sm font-medium text-gray-700 block mb-3">
                Lokalizacja
              </label>
              
              {/* Show constant location */}
              <div className="mb-3 p-3 bg-blue-100 border border-blue-300 rounded-md">
                <div className="flex items-center">
                  <span className="text-blue-600 mr-2">📍</span>
                  <div>
                    <p className="text-sm font-medium text-blue-800">Twoja lokalizacja</p>
                    <p className="text-xs text-blue-600">
                      Współrzędne: {CONSTANT_LOCATION.lat.toFixed(6)}, {CONSTANT_LOCATION.lng.toFixed(6)}
                    </p>
                  </div>
                </div>
              </div>

            </div>

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
                    className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors"
                  >
                    <span className="text-2xl mb-2">{option.icon}</span>
                    <span className="text-xs text-center font-medium text-gray-700">
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
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
});

ReportDifficultyDrawer.displayName = 'ReportDifficultyDrawer';

export default ReportDifficultyDrawer;