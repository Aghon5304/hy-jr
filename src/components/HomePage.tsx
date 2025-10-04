'use client';

import Link from 'next/link';
import TripPlanner, { TripPlanData } from '@/components/TripPlanner';

export default function HomePage() {
  const handlePlanTrip = (tripData: TripPlanData) => {
    console.log('Planning trip:', tripData);
    // Here you would typically:
    // 1. Validate the data
    // 2. Make API calls to search for routes
    // 3. Navigate to results page or show loading state
    alert(`Searching routes from ${tripData.from} to ${tripData.to} on ${tripData.date} at ${tripData.time}`);
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-sm mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          🚂 Travel App
        </h1>
        
        {/* Trip Planner Component */}
        <TripPlanner onPlanTrip={handlePlanTrip} />
        
        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-4 text-sm text-gray-500">or</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>
        
        {/* View Existing Trip */}
        <Link 
          href="/TripInfo"
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-4 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2 active:bg-gray-300"
        >
          <span className="text-lg">👀</span>
          <span>View Current Trip</span>
        </Link>
      </div>
    </main>
  );
}