import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-sm mx-auto text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">
          🚂 Travel App
        </h1>
        
        <Link 
          href="/TripInfo"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-8 rounded-xl transition-colors active:bg-blue-800"
        >
          View Trip
        </Link>
      </div>
    </main>
  );
}
