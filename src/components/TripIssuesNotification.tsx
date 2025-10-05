'use client';

import { useState, useEffect } from 'react';
import { DelayReason } from '@/types/Report';

interface TripIssuesNotificationProps {
  tripId?: string;
  selectedIssueType?: string;
  collisions?: any[];
  onClose?: () => void;
  onConfirm?: () => void;
}

const TripIssuesNotification: React.FC<TripIssuesNotificationProps> = ({ 
  tripId = "Line 23 - Downtown Route", 
  selectedIssueType = 'delay',
  collisions = [],
  onClose,
  onConfirm 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Map difficulty options to DelayReason
  const mapIssueTypeToDelayReason = (issueType: string): DelayReason => {
    const mapping: { [key: string]: DelayReason } = {
      'delay': DelayReason.TRAFFIC,
      'breakdown': DelayReason.BREAKDOWN,
      'overcrowding': DelayReason.OTHER,
      'accessibility': DelayReason.OTHER,
      'safety': DelayReason.OTHER,
      'other': DelayReason.OTHER
    };
    return mapping[issueType] || DelayReason.OTHER;
  };

  // Calculate data from collisions or use defaults
  const numberOfReports = collisions.length || 1;
  const firstCollision = collisions[0];
  const reportedLocation = firstCollision 
    ? `Lat: ${firstCollision.delay.location.lat.toFixed(4)}, Lng: ${firstCollision.delay.location.lng.toFixed(4)}`
    : "Route Location";
  
  // Get the most recent report time
  const getReportTime = () => {
    if (firstCollision?.delay?.timestamp) {
      return new Date(firstCollision.delay.timestamp).toLocaleString();
    }
    return new Date().toLocaleString();
  };
  
  // Estimate delay based on collision severity and type
  const calculateEstimatedDelay = () => {
    if (collisions.length === 0) return 5; // Default fallback
    
    const baseDelay: { [key: string]: number } = {
      'delays': 8,
      'route-difficulties': 15,
      'breakdown': 25,
      'no-vehicle': 30,
      'route-change': 12,
      'accessibility': 10,
      'overcrowding': 6,
      'ticket-control': 4
    };
    
    const delayType = firstCollision?.delay?.cause || selectedIssueType;
    const baseTime = baseDelay[delayType] || 10;
    
    // Increase delay based on number of reports
    const multiplier = Math.min(1 + (numberOfReports - 1) * 0.3, 2.5);
    
    return Math.round(baseTime * multiplier);
  };
  
  const estimatedDelay = calculateEstimatedDelay();
  const issueType = mapIssueTypeToDelayReason(firstCollision?.delay?.cause || selectedIssueType);

  useEffect(() => {
    // Show notification after component mounts
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const getSeverityColor = (reportCount: number) => {
    if (reportCount >= 6) return 'text-red-600 bg-red-50';
    if (reportCount >= 3) return 'text-orange-600 bg-orange-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  const getIssueIcon = (type: DelayReason) => {
    const icons = {
      [DelayReason.BREAKDOWN]: '🔧',
      [DelayReason.ACCIDENT]: '🚨',
      [DelayReason.TRAFFIC]: '🚦',
      [DelayReason.WEATHER]: '🌧️',
      [DelayReason.TECHNICAL]: '⚙️',
      [DelayReason.OTHER]: '❗'
    };
    return icons[type] || '❗';
  };

  const getIssueTypeLabel = (selectedType: string, delayType: DelayReason) => {
    // Use the original difficulty option labels when possible
    const difficultyLabels: { [key: string]: string } = {
      'delay': 'Opóźnienie Pojazdu',
      'breakdown': 'Awaria Pojazdu',
      'overcrowding': 'Przepełnienie',
      'accessibility': 'Problem z Dostępnością',
      'safety': 'Problem Bezpieczeństwa',
      'other': 'Inny Problem'
    };
    
    return difficultyLabels[selectedType] || {
      [DelayReason.BREAKDOWN]: 'Awaria Pojazdu',
      [DelayReason.ACCIDENT]: 'Wypadek',
      [DelayReason.TRAFFIC]: 'Duży Ruch',
      [DelayReason.WEATHER]: 'Problem Pogodowy',
      [DelayReason.TECHNICAL]: 'Problem Techniczny',
      [DelayReason.OTHER]: 'Inny Problem'
    }[delayType] || 'Nieznany Problem';
  };

  const handleClose = () => {
    setIsVisible(false);
    setIsExpanded(false);
    setTimeout(() => onClose?.(), 300);
  };

  const handleToggleExpand = () => {
    if (isExpanded) {
      // Start collapse animation
      setIsCollapsing(true);
      setTimeout(() => {
        setIsExpanded(false);
        setIsCollapsing(false);
      }, 500); // Match the transition duration
    } else {
      // Expand immediately
      setIsExpanded(true);
    }
  };

  // Touch event handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null); // Reset touch end
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isUpSwipe = distance > 50; // Swipe up threshold
    const isDownSwipe = distance < -50; // Swipe down threshold
    
    if (isUpSwipe && isExpanded) {
      // Swipe up to minimize when expanded
      handleToggleExpand();
    } else if (isDownSwipe && !isExpanded) {
      // Swipe down to expand when minimized
      handleToggleExpand();
    }
    
    // Reset touch values
    setTouchStart(null);
    setTouchEnd(null);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4">
      <div 
        onClick={handleToggleExpand}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`
          bg-white rounded-2xl shadow-2xl max-w-md mx-auto overflow-hidden
          transform transition-all duration-500 ease-out cursor-pointer
          ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
          ${(isExpanded && !isCollapsing) ? 'max-h-[80vh]' : 'max-h-20'}
          hover:shadow-xl touch-pan-y
        `}
      >
        {/* Drag Handle - Visual indicator for swipe */}
        <div className="bg-gradient-to-r from-red-400 to-orange-400 py-1 flex justify-center">
          <div className="w-8 h-1 bg-white/60 rounded-full"></div>
        </div>

        {/* Minimized Header - Always Visible */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xl">🚌</span>
              <div>
                <h2 className="text-sm font-bold">
                  {!isExpanded ? 'Są problemy na trasie! Przesuń lub stuknij aby zobaczyć więcej' : 'Problemy z Podróżą - Przesuń w górę aby zminimalizować'}
                </h2>
                <p className="text-red-100 text-xs">{tripId}</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="text-white/80 hover:text-white text-xl font-light"
            >
              ×
            </button>
          </div>
        </div>

        {/* Expanded Content - Only visible when expanded and not collapsing */}
        {(isExpanded || isCollapsing) && (
          <div className={`transition-all duration-500 ${isCollapsing ? 'opacity-0 transform -translate-y-4' : 'opacity-100 transform translate-y-0'}`}>
            {/* Main Content */}
            <div className="p-4">
              {/* Estimated Delay */}
              <div className="text-center mb-4">
                <div className="flex items-center justify-center space-x-2 mb-1">
                  <span className="text-2xl">⏰</span>
                  <div>
                    <p className="text-xs text-gray-600">Szacowane Opóźnienie</p>
                    <p className="text-2xl font-bold text-red-600">{estimatedDelay} min</p>
                  </div>
                </div>
              </div>

              {/* Issue Type */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getIssueIcon(issueType)}</span>
                  <div>
                    <p className="text-xs text-gray-600">Typ Problemu</p>
                    <p className="text-sm font-semibold text-gray-800">{getIssueTypeLabel(selectedIssueType, issueType)}</p>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">📍</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600">Zgłoszona Lokalizacja</p>
                    <p className="text-sm font-semibold text-gray-800">{reportedLocation}</p>
                    {firstCollision?.delay?.vehicleNumber && (
                      <p className="text-xs text-gray-500">Pojazd: {firstCollision.delay.vehicleNumber}</p>
                    )}
                    <p className="text-xs text-gray-500">Zgłoszono: {getReportTime()}</p>
                  </div>
                </div>
              </div>

              {/* Number of Reports */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">👥</span>
                  <div>
                    <p className="text-xs text-gray-600">Liczba Zgłoszeń</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-semibold text-gray-800">{numberOfReports}</p>
                      <span className={`
                        px-1.5 py-0.5 rounded-full text-xs font-medium
                        ${getSeverityColor(numberOfReports)}
                      `}>
                        {numberOfReports >= 6 ? 'Wysoki' : numberOfReports >= 3 ? 'Średni' : 'Niski'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-gray-50 border-t">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Delay confirmed by user - awarding points and closing popup');
                    onConfirm?.(); // Call onConfirm callback to increment points
                    handleClose();
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white py-2 px-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Potwierdź
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white py-2 px-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Odrzuć
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TripIssuesNotification;