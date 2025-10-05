'use client';

import { useState, useCallback } from 'react';

interface UserProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  name?: string;
  points?: number;
}

export default function UserProfilePanel({ isOpen, onClose, name = "User", points = 0 }: UserProfilePanelProps) {
  // Drag state
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragCurrentY, setDragCurrentY] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate drag offset
  const dragOffset = dragStartY !== null && dragCurrentY !== null 
    ? Math.min(0, dragCurrentY - dragStartY) // Only allow dragging upwards (negative values)
    : 0;

  // Handle drag start (mouse and touch)
  const handleDragStart = useCallback((clientY: number) => {
    setDragStartY(clientY);
    setDragCurrentY(clientY);
    setIsDragging(true);
  }, []);

  // Handle drag move (mouse and touch)
  const handleDragMove = useCallback((clientY: number) => {
    if (dragStartY === null) return;
    setDragCurrentY(clientY);
  }, [dragStartY]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (dragOffset < -100) { // Close if dragged up more than 100px
      onClose();
    }
    
    // Reset drag state
    setDragStartY(null);
    setDragCurrentY(null);
    setIsDragging(false);
  }, [dragOffset, onClose]);

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    handleDragMove(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (isDragging) handleDragEnd();
  };

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    handleDragStart(e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleDragMove(e.clientY);
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
      
      {/* Sliding Panel - Drops down from top */}
      <div 
        className={`fixed left-1/2 w-80 bg-white shadow-2xl z-50 overflow-y-auto select-none rounded-b-2xl ${
          isDragging ? '' : 'transition-all duration-300 ease-in-out'
        }`}
        style={{
          top: isOpen ? `72px` : '-100%', // Position below the user panel
          transform: `translateX(-50%) translateY(${dragOffset}px)`,
          maxHeight: '80vh',
          opacity: isOpen ? 1 : 0
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
            👤 User Profile
          </h1>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <span className="text-xl">❌</span>
          </button>
        </div>
        
        <div className="p-4">
          {/* User Profile Card */}
          <div className="bg-gray-50 rounded-2xl shadow-sm p-6 mb-4">
            {/* Avatar Section */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                <svg 
                  width="48" 
                  height="48" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-gray-500"
                >
                  <path 
                    d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" 
                    fill="currentColor"
                  />
                  <path 
                    d="M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" 
                    fill="currentColor"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">{name}</h2>
              <div className="text-sm text-gray-500">Transit User</div>
            </div>

            {/* Points Section */}
            <div className="text-center mb-6">
              <div className="text-3xl font-bold text-blue-600 mb-1">{points.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Total Points Earned</div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-3 bg-white rounded-xl">
                <div className="text-lg font-semibold text-gray-900">12</div>
                <div className="text-xs text-gray-500">Trips This Week</div>
              </div>
              <div className="text-center p-3 bg-white rounded-xl">
                <div className="text-lg font-semibold text-gray-900">3.2 km</div>
                <div className="text-xs text-gray-500">CO₂ Saved</div>
              </div>
            </div>
          </div>

          {/* Achievements Section */}
          <div className="bg-gray-50 rounded-2xl shadow-sm p-4 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Recent Achievements</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-white rounded-xl">
                <div className="text-2xl">🚌</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Transit Explorer</div>
                  <div className="text-xs text-gray-500">Used 5 different bus routes</div>
                </div>
                <div className="text-sm font-semibold text-blue-600">+50 pts</div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-white rounded-xl">
                <div className="text-2xl">🌱</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Eco Warrior</div>
                  <div className="text-xs text-gray-500">Saved 1kg of CO₂ this week</div>
                </div>
                <div className="text-sm font-semibold text-blue-600">+25 pts</div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-white rounded-xl">
                <div className="text-2xl">📱</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">App Pioneer</div>
                  <div className="text-xs text-gray-500">Reported your first issue</div>
                </div>
                <div className="text-sm font-semibold text-blue-600">+100 pts</div>
              </div>
            </div>
          </div>

          {/* Activity Section */}
          <div className="bg-gray-50 rounded-2xl shadow-sm p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 This Week's Activity</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Monday</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 h-2 bg-gray-200 rounded-full">
                    <div className="w-12 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                  <span className="text-xs text-gray-500">3 trips</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tuesday</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 h-2 bg-gray-200 rounded-full">
                    <div className="w-8 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                  <span className="text-xs text-gray-500">2 trips</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Wednesday</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 h-2 bg-gray-200 rounded-full">
                    <div className="w-16 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                  <span className="text-xs text-gray-500">4 trips</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Today</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 h-2 bg-gray-200 rounded-full">
                    <div className="w-10 h-2 bg-green-500 rounded-full"></div>
                  </div>
                  <span className="text-xs text-gray-500">3 trips</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}