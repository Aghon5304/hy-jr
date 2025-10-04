'use client';

import { useState, useCallback } from 'react';
import { Trip, sampleTrip, TripHelper } from '@/types/Trip';

interface TripInfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TripInfoPanel({ isOpen, onClose }: TripInfoPanelProps) {
  // Use the sample trip data from the Trip model
  const trip: Trip = sampleTrip;
  const firstStep = TripHelper.getFirstStep(trip);
  const lastStep = TripHelper.getLastStep(trip);

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
            🚂 Your Journey
          </h1>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <span className="text-xl">❌</span>
          </button>
        </div>
        
        <div className="p-4">
          {/* Trip Overview Card */}
          <div className="bg-gray-50 rounded-2xl shadow-sm p-4 mb-4">
            {/* Route Overview */}
            <div className="mb-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-base font-semibold text-gray-900">{firstStep?.departureStation}</div>
                  <div className="text-xs text-gray-500">{firstStep?.departureLocation}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">{firstStep?.departureTime}</div>
                  <div className="text-xs text-blue-500">in {trip.timeUntilDeparture}</div>
                </div>
              </div>
              
              {/* Journey Line */}
              <div className="flex items-center my-3 px-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1 h-0.5 bg-gray-300 mx-2"></div>
                <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                  {trip.steps.length} step{trip.steps.length > 1 ? 's' : ''} • {trip.totalTravelTime}
                </div>
                <div className="flex-1 h-0.5 bg-gray-300 mx-2"></div>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
              
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-semibold text-gray-900">{lastStep?.arrivalStation}</div>
                  <div className="text-xs text-gray-500">{lastStep?.arrivalLocation}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">{lastStep?.arrivalTime}</div>
                  {trip.totalDelayMinutes > 0 && (
                    <div className="text-xs text-red-500">+{trip.totalDelayMinutes}min delay</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Trip Steps */}
          <div className="space-y-3 mb-4">
            {trip.steps.map((step, index) => (
              <div key={step.stepId} className="bg-gray-50 rounded-xl shadow-sm p-4">
                {/* Step Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                      {index + 1}
                    </div>
                    <div className="text-sm font-medium text-gray-700">
                      {step.transportMode === 'train' && '🚂'}
                      {step.transportMode === 'bus' && '🚌'}
                      {step.transportMode === 'tram' && '🚋'}
                      <span className="ml-1 capitalize">{step.transportMode}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">{step.stepDuration}</div>
                </div>

                {/* Step Details */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{step.departureStation}</div>
                      <div className="text-xs text-gray-500">
                        {step.platform && `Platform ${step.platform} • `}{step.departureLocation}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-blue-600">{step.departureTime}</div>
                      {step.delayMinutes > 0 && (
                        <div className="text-xs text-red-500">+{step.delayMinutes}min</div>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center justify-center py-1">
                    <div className="w-4 h-0.5 bg-gray-300"></div>
                    <span className="mx-2 text-gray-400">→</span>
                    <div className="w-4 h-0.5 bg-gray-300"></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{step.arrivalStation}</div>
                      <div className="text-xs text-gray-500">{step.arrivalLocation}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-600">{step.arrivalTime}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Status Bar */}
          <div className={`rounded-xl p-4 mb-4 ${
            TripHelper.isDelayed(trip) 
              ? 'bg-red-50 border border-red-200' 
              : 'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">
                  {TripHelper.isDelayed(trip) ? '⚠️' : '✅'}
                </span>
                <div>
                  <div className={`text-sm font-medium ${
                    TripHelper.isDelayed(trip) ? 'text-red-800' : 'text-green-800'
                  }`}>
                    {TripHelper.getStatusMessage(trip)}
                  </div>
                  <div className="text-xs text-gray-600">
                    Departure in {trip.timeUntilDeparture}
                  </div>
                </div>
              </div>
              
              {TripHelper.isDelayed(trip) && (
                <div className="text-right">
                  <div className="text-sm font-bold text-red-700">+{trip.totalDelayMinutes}min</div>
                  <div className="text-xs text-red-600">delay</div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mb-4">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2 active:bg-blue-800">
              <span className="text-lg">📍</span>
              <span>Track Live Journey</span>
            </button>
            
            <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2 active:bg-gray-300">
              <span className="text-lg">🔄</span>
              <span>Refresh Status</span>
            </button>
          </div>
          
          {/* Footer Info */}
          <div className="bg-gray-50 rounded-xl shadow-sm p-3">
            <div className="text-xs text-gray-500 text-center">
              Updated {new Date().toLocaleTimeString()} • Tap to refresh
            </div>
          </div>
        </div>
      </div>
    </>
  );
}