'use client';

import { useState } from 'react';
import { Report, DelayReason } from '@/types/Report';

interface ReportIssueWidgetProps {
  onSubmitReport?: (report: Report) => void;
}

export default function ReportIssueWidget({ onSubmitReport }: ReportIssueWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [report, setReport] = useState<Partial<Report>>({
    reporterLocation: 'on_vehicle',
    coordinates: { latitude: 0, longitude: 0 }
  });

  const handleLocationChange = (location: 'on_vehicle' | 'at_stop') => {
    setReport(prev => ({
      ...prev,
      reporterLocation: location,
      // Reset location-specific fields
      vehicleNumber: undefined,
      delayReason: undefined,
      customReason: undefined,
      lineNumber: undefined
    }));
  };

  const handleSubmit = () => {
    if (onSubmitReport && isValidReport()) {
      // Get current GPS coordinates
      navigator.geolocation.getCurrentPosition((position) => {
        const finalReport: Report = {
          ...report as Report,
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        };
        onSubmitReport(finalReport);
        setIsExpanded(false);
        setReport({
          reporterLocation: 'on_vehicle',
          coordinates: { latitude: 0, longitude: 0 }
        });
      });
    }
  };

  const isValidReport = (): boolean => {
    if (report.reporterLocation === 'on_vehicle') {
      return !!(report.vehicleNumber && report.delayReason);
    } else {
      return !!(report.lineNumber);
    }
  };

  const styles = {
    container: isExpanded 
      ? "absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 z-[9999] w-80 max-h-[70vh] overflow-y-auto"
      : "bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 relative w-full",
    button: "w-full p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50",
    buttonText: "font-medium text-gray-900",
    expandIcon: "text-gray-500 transition-transform duration-300",
    form: "p-3 border-t border-gray-200 space-y-3",
    radioGroup: "flex space-x-4",
    radioLabel: "flex items-center space-x-2 cursor-pointer",
    radioInput: "text-blue-600",
    input: "w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
    select: "w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
    submitButton: "w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:bg-gray-300",
    cancelButton: "w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
  };

  return (
    <div className={styles.container}>
      <div 
        className={styles.button}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className={styles.buttonText}>🚨 Report Issue</span>
        <span className={`${styles.expandIcon} ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </div>

      {isExpanded && (
        <div className={styles.form}>
          {/* Location Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Where are you?
            </label>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="location"
                  value="on_vehicle"
                  checked={report.reporterLocation === 'on_vehicle'}
                  onChange={() => handleLocationChange('on_vehicle')}
                  className={styles.radioInput}
                />
                <span className="text-sm">🚌 On Vehicle</span>
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="location"
                  value="at_stop"
                  checked={report.reporterLocation === 'at_stop'}
                  onChange={() => handleLocationChange('at_stop')}
                  className={styles.radioInput}
                />
                <span className="text-sm">🚏 At Stop</span>
              </label>
            </div>
          </div>

          {/* On Vehicle Fields */}
          {report.reporterLocation === 'on_vehicle' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  value={report.vehicleNumber || ''}
                  onChange={(e) => setReport(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                  placeholder="Enter vehicle side number"
                  className={styles.input}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Delay Reason
                </label>
                <select
                  value={report.delayReason || ''}
                  onChange={(e) => setReport(prev => ({ ...prev, delayReason: e.target.value as DelayReason }))}
                  className={styles.select}
                >
                  <option value="">Select reason</option>
                  <option value={DelayReason.BREAKDOWN}>Breakdown</option>
                  <option value={DelayReason.ACCIDENT}>Accident</option>
                  <option value={DelayReason.TRAFFIC}>Traffic</option>
                  <option value={DelayReason.WEATHER}>Weather</option>
                  <option value={DelayReason.TECHNICAL}>Technical Issue</option>
                  <option value={DelayReason.OTHER}>Other</option>
                </select>
              </div>

              {report.delayReason === DelayReason.OTHER && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Describe the issue
                  </label>
                  <input
                    type="text"
                    value={report.customReason || ''}
                    onChange={(e) => setReport(prev => ({ ...prev, customReason: e.target.value }))}
                    placeholder="What's causing the delay?"
                    className={styles.input}
                  />
                </div>
              )}
            </>
          )}

          {/* At Stop Fields */}
          {report.reporterLocation === 'at_stop' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Line Number
              </label>
              <input
                type="text"
                value={report.lineNumber || ''}
                onChange={(e) => setReport(prev => ({ ...prev, lineNumber: e.target.value }))}
                placeholder="Enter line number you're waiting for"
                className={styles.input}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-1 pt-1">
            <button
              onClick={handleSubmit}
              disabled={!isValidReport()}
              className={styles.submitButton}
            >
              Submit Report
            </button>
            <button
              onClick={() => setIsExpanded(false)}
              className={styles.cancelButton}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}