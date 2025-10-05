'use client';

import { useState } from 'react';

interface UserPanelProps {
  name?: string;
  points?: number;
}

export default function UserPanel({ name = "User", points = 0 }: UserPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="relative">
      {/* Header - Always Visible */}
      <div 
        className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-3 cursor-pointer hover:bg-white/95 transition-all duration-200 hover:shadow-xl pointer-events-auto"
        onClick={toggleExpanded}
      >
        <div className="flex items-center space-x-3">
          {/* Avatar Icon */}
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <svg 
              width="24" 
              height="24" 
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
          
          {/* Name and Points */}
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">{name}</div>
            <div className="text-xs text-gray-500">{points.toLocaleString()} zdobytych punktów</div>
          </div>

          {/* Chevron indicator */}
          <div className={`text-gray-400 transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                d="M9 18L15 12L9 6" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Backdrop for dismissing expanded content */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Expandable Content - Floating */}
      <div className={`absolute top-full left-0 right-0 z-50 mt-1 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl pointer-events-auto overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
        <div className="p-4">
          <div className="space-y-3">
            {/* Large Avatar Section */}
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                <svg 
                  width="32" 
                  height="32" 
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
              <div className="flex-1">
                <div className="text-lg font-bold text-gray-900">{name}</div>
                <div className="text-xs text-gray-500">Użytkownik Transportu</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{points.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Łączne Punkty</div>
              </div>
            </div>

            {/* Level Progress */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-900">Level 7</div>
                <div className="text-sm font-medium text-gray-900">Level 8</div>
              </div>
              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500" style={{width: '68%'}}></div>
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-500">
                  <span>1,250 pkt</span>
                  <span>350 do następnego poziomu</span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <div className="text-sm font-semibold text-gray-900">12</div>
                <div className="text-xs text-gray-500">Podróże w tym tygodniu</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <div className="text-sm font-semibold text-gray-900">3.2 kg</div>
                <div className="text-xs text-gray-500">Oszczędzone CO₂</div>
              </div>
            </div>

            {/* Local Ranking Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-3 border border-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="text-lg">🏅</div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Ranking Lokalny</div>
                    <div className="text-xs text-gray-600">Użytkownicy Transportu w Krakowie</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">#12</div>
                  <div className="text-xs text-gray-500">z 2,847</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}