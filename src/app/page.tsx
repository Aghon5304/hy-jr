'use client';

import Link from 'next/link';
import { useState } from 'react';
import TripPlanner, { TripPlanData } from '@/components/TripPlanner';
import ReportIssueWidget from '@/components/ReportIssueWidget';
import { Report } from '@/types/Report';
import ReportDifficultyDrawer from '@/components/ReportDifficultyDrawer';

// Styling variables
const styles = {
  main: "relative min-h-screen overflow-hidden",
  mapBackground: "absolute inset-0 bg-green-100 flex items-center justify-center",
  overlay: "relative z-10 p-4 min-h-screen",
  container: "max-w-sm mx-auto space-y-6",
  floatingCard: "bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4",
  title: "text-2xl font-bold text-gray-900 mb-6 text-center",
  divider: {
    container: "flex items-center my-6",
    line: "flex-1 border-t border-gray-300",
    text: "px-4 text-sm text-gray-500"
  },
  viewTripButton: "w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-4 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2 active:bg-gray-300",
  reportDifficultyButton: "w-full bg-red-500 hover:bg-red-600 text-white font-medium py-4 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2 active:bg-red-700",
  viewTripIcon: "text-lg"
};

export default function Home() {
  const [isDifficultyDrawerOpen, setIsDifficultyDrawerOpen] = useState(false);

  const handlePlanTrip = (tripData: TripPlanData) => {
    console.log('Planning trip:', tripData);
    // Here you would typically:
    // 1. Validate the data
    // 2. Make API calls to search for routes
    // 3. Navigate to results page or show loading state
    alert(`Searching routes from ${tripData.from} to ${tripData.to} on ${tripData.date} at ${tripData.time}`);
  };

  const handleReportIssue = (report: Report) => {
    console.log('Report submitted:', report);
    alert(`Issue reported: ${report.reporterLocation === 'on_vehicle' ? 'On vehicle' : 'At stop'}`);
  };

  const handleReportDifficulty = (cause: string, location: { lat: number; lng: number }) => {
    console.log('Difficulty reported:', { cause, location });
    // Here you would save to database
    alert(`Difficulty reported: ${cause} at location ${location.lat}, ${location.lng}`);
    setIsDifficultyDrawerOpen(false);
  };

  return (
    <main className={styles.main}>
      {/* Map Background */}
      <div className={styles.mapBackground}>
        <div className="text-center">
          <div className="text-6xl mb-4">🗺️</div>
          <div className="text-lg text-green-700 font-medium">Interactive Map</div>
          <div className="text-sm text-green-600">Real-time transit routes</div>
        </div>
      </div>

      {/* Floating Content Overlay */}
      <div className={styles.overlay}>
        <div className={styles.container}>
          <div className={styles.floatingCard}>
            <TripPlanner onPlanTrip={handlePlanTrip} />
          </div>
          
          <div className={styles.floatingCard}>
            <Link 
              href="/TripInfo"
              className={styles.viewTripButton}
            >
              <span className={styles.viewTripIcon}>👀</span>
              <span>View Current Trip</span>
            </Link>
          </div>

          <div className={styles.floatingCard}>
            <button
              onClick={() => setIsDifficultyDrawerOpen(true)}
              className={styles.reportDifficultyButton}
            >
              <span className="text-lg">⚠️</span>
              <span>Report Difficulty</span>
            </button>
          </div>

          <div className={styles.floatingCard}>
            <ReportIssueWidget onSubmitReport={handleReportIssue} />
          </div>
        </div>
      </div>

      <ReportDifficultyDrawer 
        isOpen={isDifficultyDrawerOpen}
        onClose={() => setIsDifficultyDrawerOpen(false)}
        onSubmit={handleReportDifficulty}
      />
    </main>
  );
}
