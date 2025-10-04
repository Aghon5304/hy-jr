'use client';

import { useState, useEffect } from 'react';
import { MapData, MappedStop, MappedRoute, MappedVehicle, ROUTE_TYPES } from '@/lib/gtfsMapService';
import GoogleMapsComponent from '@/components/GoogleMapsComponent';

interface MapStats {
  totalStops: number;
  totalRoutes: number;
  totalVehicles: number;
  sourceCount: number;
  lastUpdated: Date;
}

export default function MapPage() {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedSources, setSelectedSources] = useState<string[]>(['krakow1']);
  const [selectedRouteType, setSelectedRouteType] = useState<number | 'all'>('all');
  const [viewMode, setViewMode] = useState<'all' | 'stops' | 'routes' | 'vehicles'>('all');
  
  // Google Maps states
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string>('');
  const [showMap, setShowMap] = useState(false);
  const [showStops, setShowStops] = useState(true);
  const [showRoutes, setShowRoutes] = useState(false);
  const [showVehicles, setShowVehicles] = useState(true);
  const [selectedStop, setSelectedStop] = useState<MappedStop | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<MappedRoute | null>(null);

  // Available sources (you can expand this)
  const availableSources = [
    { id: 'krakow1', name: 'Kraków Buses (A)' },
    { id: 'krakow2', name: 'Kraków Buses (M)' },
    { id: 'krakow3', name: 'Kraków Trams (T)' },
    { id: 'ald', name: 'Małopolska Buses' },
    { id: 'kml', name: 'Małopolska Trains' }
  ];

  useEffect(() => {
    loadMapData();
  }, [selectedSources]);

  const loadMapData = async () => {
    if (selectedSources.length === 0) return;
    
    setLoading(true);
    setError('');
    
    try {
      const sourcesQuery = selectedSources.join(',');
      const response = await fetch(`/mapData?sources=${sourcesQuery}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error);
      }
      
      setMapData(data);
    } catch (err) {
      setError('Failed to load map data: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = mapData ? {
    stops: selectedRouteType === 'all' ? mapData.stops : 
           mapData.stops.filter(stop => 
             stop.routes.some(routeId => 
               mapData.routes.find(r => r.id === routeId)?.type === selectedRouteType
             )
           ),
    routes: selectedRouteType === 'all' ? mapData.routes : 
            mapData.routes.filter(route => route.type === selectedRouteType),
    vehicles: selectedRouteType === 'all' ? mapData.vehicles :
              mapData.vehicles.filter(vehicle => 
                mapData.routes.find(r => r.id === vehicle.routeId)?.type === selectedRouteType
              )
  } : { stops: [], routes: [], vehicles: [] };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">GTFS Transit Map</h1>
          <p className="text-gray-600">Visualize public transit data with stops, routes, and real-time vehicles</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Source Selection */}
            <div>
              <h3 className="font-semibold mb-3">Data Sources</h3>
              <div className="space-y-2">
                {availableSources.map(source => (
                  <label key={source.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedSources.includes(source.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSources([...selectedSources, source.id]);
                        } else {
                          setSelectedSources(selectedSources.filter(s => s !== source.id));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{source.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Route Type Filter */}
            <div>
              <h3 className="font-semibold mb-3">Route Type</h3>
              <select
                value={selectedRouteType}
                onChange={(e) => setSelectedRouteType(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="all">All Types</option>
                <option value={ROUTE_TYPES.TRAM}>Trams</option>
                <option value={ROUTE_TYPES.BUS}>Buses</option>
                <option value={ROUTE_TYPES.RAIL}>Trains</option>
                <option value={ROUTE_TYPES.TROLLEYBUS}>Trolleybus</option>
              </select>
            </div>

            {/* View Mode */}
            <div>
              <h3 className="font-semibold mb-3">View Mode</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'stops', label: 'Stops' },
                  { key: 'routes', label: 'Routes' },
                  { key: 'vehicles', label: 'Vehicles' }
                ].map(mode => (
                  <button
                    key={mode.key}
                    onClick={() => setViewMode(mode.key as any)}
                    className={`px-3 py-1 rounded text-sm ${
                      viewMode === mode.key
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={loadMapData}
              disabled={loading || selectedSources.length === 0}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh Data'}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
              <h4 className="font-semibold mb-2">Error</h4>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Stats */}
        {mapData && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Data Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-600">{filteredData.stops.length}</div>
                <div className="text-sm text-gray-600">Stops</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">{filteredData.routes.length}</div>
                <div className="text-sm text-gray-600">Routes</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded">
                <div className="text-2xl font-bold text-purple-600">{filteredData.vehicles.length}</div>
                <div className="text-sm text-gray-600">Vehicles</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded">
                <div className="text-2xl font-bold text-orange-600">{mapData.stats.sourceCount}</div>
                <div className="text-sm text-gray-600">Sources</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-xs font-medium text-gray-600">Updated</div>
                <div className="text-xs text-gray-500">
                  {new Date(mapData.stats.lastUpdated).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Google Maps API Key Input */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Google Maps Configuration</h3>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google Maps API Key
              </label>
              <input
                type="text"
                value={googleMapsApiKey}
                onChange={(e) => setGoogleMapsApiKey(e.target.value)}
                placeholder="Enter your Google Maps API key"
                className="w-full p-2 border border-gray-300 rounded"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get your API key from <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-blue-600 hover:underline">Google Cloud Console</a>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowMap(true)}
                disabled={!googleMapsApiKey || !mapData}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
              >
                Show Map
              </button>
              <button
                onClick={() => setShowMap(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Hide Map
              </button>
            </div>
          </div>
        </div>

        {/* Map View */}
        {showMap && googleMapsApiKey && mapData && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Interactive Map</h3>
              <div className="flex gap-2">
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showStops}
                    onChange={(e) => setShowStops(e.target.checked)}
                    className="rounded"
                  />
                  <span>Stops ({filteredData.stops.length})</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showVehicles}
                    onChange={(e) => setShowVehicles(e.target.checked)}
                    className="rounded"
                  />
                  <span>Vehicles ({filteredData.vehicles.length})</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showRoutes}
                    onChange={(e) => setShowRoutes(e.target.checked)}
                    className="rounded"
                  />
                  <span>Routes ({filteredData.routes.length})</span>
                </label>
              </div>
            </div>
            
            <div className="h-96 relative">
              <GoogleMapsComponent
                stops={filteredData.stops}
                routes={filteredData.routes}
                vehicles={filteredData.vehicles}
                bounds={mapData.bounds}
                apiKey={googleMapsApiKey}
                showStops={showStops}
                showRoutes={showRoutes}
                showVehicles={showVehicles}
                onStopClick={(stop: MappedStop) => {
                  console.log('Stop clicked:', stop);
                  setSelectedStop(stop);
                }}
                onRouteClick={(route: MappedRoute) => {
                  console.log('Route clicked:', route);
                  setSelectedRoute(route);
                }}
              />
            </div>
            
            {/* Selected Item Details */}
            {(selectedStop || selectedRoute) && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                {selectedStop && (
                  <div>
                    <h4 className="font-semibold mb-2">Selected Stop: {selectedStop.name}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div><strong>ID:</strong> {selectedStop.id}</div>
                      <div><strong>Coordinates:</strong> {selectedStop.lat.toFixed(4)}, {selectedStop.lng.toFixed(4)}</div>
                      <div><strong>Routes:</strong> {selectedStop.routes.length}</div>
                      <div><strong>Source:</strong> {selectedStop.sourceId}</div>
                    </div>
                  </div>
                )}
                {selectedRoute && (
                  <div>
                    <h4 className="font-semibold mb-2">Selected Route: {selectedRoute.shortName} - {selectedRoute.longName}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div><strong>Type:</strong> {getRouteTypeName(selectedRoute.type)}</div>
                      <div><strong>Stops:</strong> {selectedRoute.stops.length}</div>
                      <div><strong>Color:</strong> {selectedRoute.color || 'Default'}</div>
                      <div><strong>Source:</strong> {selectedRoute.sourceId}</div>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => {
                    setSelectedStop(null);
                    setSelectedRoute(null);
                  }}
                  className="mt-2 text-sm text-blue-600 hover:underline"
                >
                  Clear selection
                </button>
              </div>
            )}
          </div>
        )}

        {/* Data Tables */}
        {mapData && (
          <div className="space-y-6">
            
            {/* Stops Table */}
            {(viewMode === 'all' || viewMode === 'stops') && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Stops ({filteredData.stops.length})</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-left">Coordinates</th>
                        <th className="px-3 py-2 text-left">Routes</th>
                        <th className="px-3 py-2 text-left">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.stops.slice(0, 20).map((stop, index) => (
                        <tr key={stop.id} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">{stop.name}</td>
                          <td className="px-3 py-2 text-gray-600">
                            {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
                          </td>
                          <td className="px-3 py-2 text-gray-600">{stop.routes.length} routes</td>
                          <td className="px-3 py-2 text-gray-600">{stop.sourceId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredData.stops.length > 20 && (
                    <p className="text-sm text-gray-500 mt-2">
                      Showing first 20 of {filteredData.stops.length} stops
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Routes Table */}
            {(viewMode === 'all' || viewMode === 'routes') && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Routes ({filteredData.routes.length})</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Short Name</th>
                        <th className="px-3 py-2 text-left">Long Name</th>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-left">Color</th>
                        <th className="px-3 py-2 text-left">Stops</th>
                        <th className="px-3 py-2 text-left">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.routes.slice(0, 20).map((route) => (
                        <tr key={route.id} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">{route.shortName}</td>
                          <td className="px-3 py-2">{route.longName}</td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                              {getRouteTypeName(route.type)}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {route.color && (
                              <div
                                className="w-4 h-4 rounded border"
                                style={{ backgroundColor: route.color }}
                                title={route.color}
                              />
                            )}
                          </td>
                          <td className="px-3 py-2 text-gray-600">{route.stops.length}</td>
                          <td className="px-3 py-2 text-gray-600">{route.sourceId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredData.routes.length > 20 && (
                    <p className="text-sm text-gray-500 mt-2">
                      Showing first 20 of {filteredData.routes.length} routes
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Vehicles Table */}
            {(viewMode === 'all' || viewMode === 'vehicles') && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Real-time Vehicles ({filteredData.vehicles.length})</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Vehicle ID</th>
                        <th className="px-3 py-2 text-left">Route</th>
                        <th className="px-3 py-2 text-left">Position</th>
                        <th className="px-3 py-2 text-left">Speed</th>
                        <th className="px-3 py-2 text-left">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.vehicles.slice(0, 20).map((vehicle) => (
                        <tr key={vehicle.id} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">{vehicle.label || vehicle.id}</td>
                          <td className="px-3 py-2">{vehicle.routeId}</td>
                          <td className="px-3 py-2 text-gray-600">
                            {vehicle.lat.toFixed(4)}, {vehicle.lng.toFixed(4)}
                          </td>
                          <td className="px-3 py-2">{vehicle.speed ? `${vehicle.speed} m/s` : 'N/A'}</td>
                          <td className="px-3 py-2 text-gray-600">
                            {vehicle.timestamp ? new Date(vehicle.timestamp * 1000).toLocaleTimeString() : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredData.vehicles.length > 20 && (
                    <p className="text-sm text-gray-500 mt-2">
                      Showing first 20 of {filteredData.vehicles.length} vehicles
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* API Usage Examples */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">API Usage Examples</h3>
          <div className="space-y-2 text-sm font-mono bg-gray-50 p-4 rounded">
            <div>GET /mapData?sources=krakow1,krakow2</div>
            <div>GET /mapData?sources=krakow1&filter=stops</div>
            <div>GET /mapData?sources=ald&filter=routes&routeType=3</div>
            <div>GET /mapData?sources=krakow1&filter=vehicles</div>
            <div>GET /mapData?bounds=50.1,50.0,20.1,19.9&filter=stops</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getRouteTypeName(type: number): string {
  const names: Record<number, string> = {
    0: 'Tram', 1: 'Subway', 2: 'Rail', 3: 'Bus', 4: 'Ferry',
    5: 'Cable Tram', 6: 'Aerial Lift', 7: 'Funicular', 11: 'Trolleybus', 12: 'Monorail'
  };
  return names[type] || `Type ${type}`;
}