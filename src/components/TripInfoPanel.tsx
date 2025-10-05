'use client';

import { useState, useCallback, useEffect } from 'react';
import { SavedJourney, deleteJourney } from '@/lib/journeyManager';

// Helper function to get delay icon and info
function getDelayIcon(cause: string): { icon: string; color: string; name: string } {
  const delayTypes: Record<string, { icon: string; color: string; name: string }> = {
    'delays': { icon: '🕐', color: '#f59e0b', name: 'Opóźnienia' },
    'route-difficulties': { icon: '🚧', color: '#dc2626', name: 'Utrudnienia na trasie' },
    'no-vehicle': { icon: '❌', color: '#991b1b', name: 'Brak pojazdu' },
    'route-change': { icon: '↩️', color: '#7c3aed', name: 'Zmiana trasy' },
    'accessibility': { icon: '♿', color: '#0891b2', name: 'Problemy z dostępnością' },
    'breakdown': { icon: '⚠️', color: '#ea580c', name: 'Awaria pojazdu' },
    'overcrowding': { icon: '👥', color: '#65a30d', name: 'Tłok/Przepełnienie' },
    'ticket-control': { icon: '🎫', color: '#4338ca', name: 'Kontrola biletów' }
  };
  return delayTypes[cause] || { icon: '⚠️', color: '#6b7280', name: 'Inne utrudnienie' };
}

interface TripInfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  savedJourney?: SavedJourney | null;
  onJourneyDeleted?: () => void;
  collisions?: any[];
}

export default function TripInfoPanel({ isOpen, onClose, savedJourney, onJourneyDeleted, collisions = [] }: TripInfoPanelProps) {
  // Persistent collision state - keeps delay info even after popup closes
  const [persistentCollisions, setPersistentCollisions] = useState<any[]>([]);

  // Update persistent collisions when new collisions come in
  useEffect(() => {
    if (collisions.length > 0) {
      setPersistentCollisions(collisions);
    }
  }, [collisions]);

  // Drag state
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragCurrentX, setDragCurrentX] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate drag offset
  const dragOffset = dragStartX !== null && dragCurrentX !== null 
    ? Math.max(0, dragCurrentX - dragStartX) // Only allow dragging to the right
    : 0;

  // Handle drag start (mouse and touch)
  const handleDragStart = useCallback((clientX: number) => {
    setDragStartX(clientX);
    setDragCurrentX(clientX);
    setIsDragging(true);
  }, []);

  // Handle drag move (mouse and touch)
  const handleDragMove = useCallback((clientX: number) => {
    if (dragStartX === null) return;
    setDragCurrentX(clientX);
  }, [dragStartX]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (dragOffset > 100) { // Close if dragged more than 100px
      onClose();
    }
    
    // Reset drag state
    setDragStartX(null);
    setDragCurrentX(null);
    setIsDragging(false);
  }, [dragOffset, onClose]);

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling while dragging
    handleDragMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Mouse event handlers (for desktop testing)
  const handleMouseDown = (e: React.MouseEvent) => {
    handleDragStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleDragMove(e.clientX);
  };

  const handleMouseUp = () => {
    if (isDragging) handleDragEnd();
  };

  // Handle journey deletion
  const handleDeleteJourney = () => {
    if (savedJourney) {
      const confirmDelete = window.confirm(
        `Are you sure you want to delete your saved journey from ${savedJourney.fromStop.name} to ${savedJourney.toStop.name}?`
      );
      
      if (confirmDelete) {
        deleteJourney(savedJourney.id);
        onJourneyDeleted?.();
        onClose();
      }
    }
  };



  return (
    <>
      {/* Invisible backdrop for dismissing panel */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Sliding Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 transform overflow-y-auto select-none ${
          isDragging ? '' : 'transition-transform duration-300 ease-in-out'
        }`}
        style={{
          transform: isOpen 
            ? `translateX(${dragOffset}px)` 
            : 'translateX(100%)'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} // Handle mouse leaving the panel
      >
        {/* Header with Close Button */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
          <h1 className="text-xl font-bold text-gray-900">
            {savedJourney ? '💾 Saved Journey' : '🚂 Your Journey'}
          </h1>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <span className="text-xl">❌</span>
          </button>
        </div>
         <div className="p-4">
          {/* Saved Journey Display */}
          {savedJourney ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center">
                <h2 className="text-lg font-bold text-gray-900">{savedJourney.name}</h2>
                <p className="text-sm text-gray-500">
                  Saved on {new Date(savedJourney.savedAt).toLocaleDateString()}
                </p>
              </div>

              {/* Journey Flow */}
              <div className="space-y-8">
                {/* Starting Station */}
                <div className="flex items-center space-x-4">
                  <div className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="text-lg font-semibold text-gray-900">{savedJourney.fromStop.name}</div>
                    <div className="text-sm text-gray-500">Starting Point</div>
                  </div>
                </div>

                {/* Journey Line with Delay Information */}
                <div className="flex items-start space-x-4">
                  <div className="flex flex-col items-center">
                    <div className="w-0.5 h-12 bg-gray-300"></div>
                    <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                    <div className="w-0.5 h-12 bg-gray-300"></div>
                  </div>
                  <div className="flex-1 py-6">
                    {/* Delay Status */}
                    {persistentCollisions.length > 0 ? (
                      // Show actual collision/delay information
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{getDelayIcon(persistentCollisions[0].delay.cause).icon}</span>
                          <div>
                            <div className="text-sm font-medium text-red-800">
                              {getDelayIcon(persistentCollisions[0].delay.cause).name}
                            </div>
                            <div className="text-xs text-red-600">
                              On route {persistentCollisions[0].route.routeShortName}
                            </div>
                            {persistentCollisions[0].delay.vehicleNumber && (
                              <div className="text-xs text-gray-500 mt-1">
                                Vehicle: {persistentCollisions[0].delay.vehicleNumber}
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              Reported: {new Date(persistentCollisions[0].delay.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        {persistentCollisions.length > 1 && (
                          <div className="mt-2 text-xs text-red-600">
                            +{persistentCollisions.length - 1} more issue{persistentCollisions.length > 2 ? 's' : ''} detected
                          </div>
                        )}
                      </div>
                    ) : (
                      // Show monitoring status when no delays
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">✅</span>
                          <div>
                            <div className="text-sm font-medium text-green-800">Route Clear</div>
                            <div className="text-xs text-green-600">No delays detected</div>
                            <div className="text-xs text-gray-500 mt-1">Monitoring for issues...</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Destination Station */}
                <div className="flex items-center space-x-4">
                  <div className="w-4 h-4 bg-red-500 rounded-full flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="text-lg font-semibold text-gray-900">{savedJourney.toStop.name}</div>
                    <div className="text-sm text-gray-500">Destination</div>
                  </div>
                </div>
              </div>

              {/* Route Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Available Routes</h3>
                <div className="space-y-2">
                  {savedJourney.routeConnections.map((route, index) => (
                    <div key={index} className="text-sm text-gray-600 bg-white rounded px-3 py-2 border border-gray-200">
                      🚌 {route.routeShortName} - {route.routeLongName}
                    </div>
                  ))}
                </div>
              </div>

              {/* Delete Journey Button */}
              <button
                onClick={handleDeleteJourney}
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 border border-red-200"
              >
                <span>🗑️</span>
                <span>Cancel Journey</span>
              </button>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">🚂</div>
              <h3 className="text-lg font-medium mb-2">No Saved Journey</h3>
              <p className="text-sm">Save a journey from the trip planner to see it here.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}