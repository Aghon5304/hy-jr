'use client';

import { useState } from 'react';

interface UserPanelProps {
  name?: string;
  points?: number;
}

export default function UserPanel({ name = "Użytkownik", points = 0 }: UserPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Dictionary mapping point thresholds to level info
  const userLevels = {
    2000: { level: 4, title: "Mistrz Zgłoszeń" },
    1000: { level: 3, title: "Zaufany Reporter" },
    500: { level: 2, title: "Strażnik Punktualności" },
    0: { level: 1, title: "Świeżak" }
  };

  // Helper function to get user level info based on points
  const getUserLevelInfo = (points: number) => {
    const thresholds = Object.keys(userLevels).map(Number).sort((a, b) => b - a);
    const currentThreshold = thresholds.find(t => points >= t) || 0;
    const nextThresholdIndex = thresholds.indexOf(currentThreshold) - 1;
    const nextThreshold = nextThresholdIndex >= 0 ? thresholds[nextThresholdIndex] : null;
    
    let pointsToNextLevel = 0;
    let progressPercentage = 100;
    let pointsInCurrentLevel = 0;
    let pointsNeededForCurrentLevel = nextThreshold ? (nextThreshold - currentThreshold) : 0;
    
    if (nextThreshold) {
      pointsToNextLevel = nextThreshold - points;
      pointsInCurrentLevel = points - currentThreshold;
      progressPercentage = (pointsInCurrentLevel / pointsNeededForCurrentLevel) * 100;
    }
    
    return { 
      ...userLevels[currentThreshold as keyof typeof userLevels], 
      pointsToNextLevel,
      progressPercentage,
      currentThreshold,
      nextThreshold,
      pointsInCurrentLevel,
      pointsNeededForCurrentLevel
    };
  };

  // Get current user level info
  const currentLevelInfo = getUserLevelInfo(points);

  return (
    <div className="relative">
      {/* Unified Panel Container - Extends seamlessly */}
      <div className={`bg-white/90 backdrop-blur-sm shadow-lg pointer-events-auto transition-all duration-300 ease-in-out ${isExpanded ? 'rounded-2xl shadow-xl' : 'rounded-2xl hover:bg-white/95 hover:shadow-xl'}`}>
        {/* Header - Always Visible */}
        <div 
          className="p-3 cursor-pointer transition-all duration-200"
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
            
            {/* Name and Level */}
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">{name}</div>
              <div className="text-xs text-gray-500">Jesteś na poziomie {currentLevelInfo.level}, <span style={{ color: '#DEDE1C', textShadow: '0 0 5px rgba(222, 222, 28, 0.8)' }}>{currentLevelInfo.title}</span></div>
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

        {/* Expandable Content - Seamless Extension */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
          {/* Subtle separator line when expanded */}
          {isExpanded && <div className="border-t border-gray-100 mx-3"></div>}
          <div className="p-4">
            <div className="space-y-3">

              {/* Level Progress */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">

                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-6 rounded-full transition-all duration-500" 
                      style={{width: `${Math.min(currentLevelInfo.progressPercentage, 100)}%`}}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-500">
                    <span>{currentLevelInfo.currentThreshold} pkt</span>
                    <span>
                      {currentLevelInfo.nextThreshold ? (
                        `${currentLevelInfo.nextThreshold} pkt`
                      ) : (
                        'Max'
                      )}
                    </span>
                  </div>
                  <div className="text-center mt-1 text-xs text-gray-600">
                    {currentLevelInfo.pointsToNextLevel === 0 ? 
                      'Najwyższy poziom!' : 
                      `Brakuje Ci ${currentLevelInfo.pointsNeededForCurrentLevel-currentLevelInfo.pointsToNextLevel} punktów do następnego poziomu!`
                    }
                  </div>
                  <button className="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors">Wymień punkty</button>
                </div>
              </div>

              {/* Local Ranking Banner */}
              <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-3 border border-blue-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="text-lg">🏅</div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Lokalny Ranking</div>
                      <div className="text-xs text-gray-600">Kraków</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">#12</div>
                    <div className="text-xs text-gray-500">z 2,847</div>
                  </div>
                </div>
              </div>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="flex items-center justify-center p-2 bg-gray-50 rounded-lg">
                  <button className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors">Zaproś znajomego</button>
                </div>
                <div className="flex items-center justify-center p-2 bg-gray-50 rounded-lg">
                  <button className="w-full h-full flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors min-h-[48px]">Info</button>
                </div>
              </div>
            </div>
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
    </div>
  );
}