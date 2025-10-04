'use client';

import Link from 'next/link';
import TripPlanner, { TripPlanData } from '@/components/TripPlanner';
import ReportIssueWidget from '@/components/ReportIssueWidget';
import MapViewer from '@/components/MapViewer';
import { Report } from '@/types/Report';

// Styling variables
const styles = {
  main: "min-h-screen bg-gray-50 p-4",
  container: "max-w-sm mx-auto",
  title: "text-2xl font-bold text-gray-900 mb-6 text-center",
  divider: {
    container: "flex items-center my-6",
    line: "flex-1 border-t border-gray-300",
    text: "px-4 text-sm text-gray-500"
  },
  viewTripButton: "w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-4 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2 active:bg-gray-300",
  viewTripIcon: "text-lg"
};

export default function Home() {

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

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <TripPlanner onPlanTrip={handlePlanTrip} />
        
        {/* Google Maps Component */}
        <div className="my-6">
          <MapViewer />
        </div>
        
        <Link 
          href="/TripInfo"
          className={styles.viewTripButton}
        >
          <span className={styles.viewTripIcon}>👀</span>
          <span>View Current Trip</span>
        </Link>

        <div className="mt-6">
          <ReportIssueWidget onSubmitReport={handleReportIssue} />
        </div>
      </div>
    </main>
  );
}
