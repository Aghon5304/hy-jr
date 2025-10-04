'use client';

import { useState, useEffect } from 'react';
import { DelayReason } from '@/types/Report';

interface TripIssuesNotificationProps {
  tripId?: string;
  selectedIssueType?: string;
  onClose?: () => void;
}

const TripIssuesNotification: React.FC<TripIssuesNotificationProps> = ({ 
  tripId = "Line 23 - Downtown Route", 
  selectedIssueType = 'delay',
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(false);

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

  // Single report dummy data
  const reportedLocation = "Main St & 3rd Ave";
  const numberOfReports = 7;
  const estimatedDelay = 12; // minutes
  const issueType = mapIssueTypeToDelayReason(selectedIssueType);

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
      'delay': 'Vehicle Delay',
      'breakdown': 'Vehicle Breakdown',
      'overcrowding': 'Overcrowding',
      'accessibility': 'Accessibility Issue',
      'safety': 'Safety Concern',
      'other': 'Other Issue'
    };
    
    return difficultyLabels[selectedType] || {
      [DelayReason.BREAKDOWN]: 'Vehicle Breakdown',
      [DelayReason.ACCIDENT]: 'Accident',
      [DelayReason.TRAFFIC]: 'Heavy Traffic',
      [DelayReason.WEATHER]: 'Weather Issue',
      [DelayReason.TECHNICAL]: 'Technical Problem',
      [DelayReason.OTHER]: 'Other Issue'
    }[delayType] || 'Unknown Issue';
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`
        bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden
        transform transition-all duration-300 ease-out
        ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
      `}>
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xl">🚌</span>
              <div>
                <h2 className="text-base font-bold">Trip Issues</h2>
                <p className="text-red-100 text-xs">{tripId}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white text-xl font-light"
            >
              ×
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4">
          {/* Estimated Delay */}
          <div className="text-center mb-4">
            <div className="flex items-center justify-center space-x-2 mb-1">
              <span className="text-2xl">⏰</span>
              <div>
                <p className="text-xs text-gray-600">Estimated Delay</p>
                <p className="text-2xl font-bold text-red-600">{estimatedDelay} min</p>
              </div>
            </div>
          </div>

          {/* Issue Type */}
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{getIssueIcon(issueType)}</span>
              <div>
                <p className="text-xs text-gray-600">Issue Type</p>
                <p className="text-sm font-semibold text-gray-800">{getIssueTypeLabel(selectedIssueType, issueType)}</p>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-lg">📍</span>
              <div>
                <p className="text-xs text-gray-600">Reported Location</p>
                <p className="text-sm font-semibold text-gray-800">{reportedLocation}</p>
              </div>
            </div>
          </div>

          {/* Number of Reports */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <span className="text-lg">👥</span>
              <div>
                <p className="text-xs text-gray-600">Number of Reports</p>
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-semibold text-gray-800">{numberOfReports}</p>
                  <span className={`
                    px-1.5 py-0.5 rounded-full text-xs font-medium
                    ${getSeverityColor(numberOfReports)}
                  `}>
                    {numberOfReports >= 6 ? 'High' : numberOfReports >= 3 ? 'Medium' : 'Low'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleClose}
              className="bg-green-500 hover:bg-green-600 text-white py-2 px-2 rounded-lg text-sm font-medium transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={handleClose}
              className="bg-red-500 hover:bg-red-600 text-white py-2 px-2 rounded-lg text-sm font-medium transition-colors"
            >
              Deny
            </button>
            <button
              onClick={handleClose}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-2 rounded-lg text-sm font-medium transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripIssuesNotification;