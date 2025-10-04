'use client';

import { useState, useEffect } from 'react';

interface GTFSFile {
  name: string;
  data: any[];
  count: number;
}

interface GTFSSource {
  id: string;
  name: string;
  url: string;
  description?: string;
}

interface CacheInfo {
  cached: boolean;
  sourceId?: string;
  sourceName?: string;
  lastFetched?: string;
  expiresAt?: string;
  isExpired?: boolean;
  sources?: any[];
  totalSources?: number;
}

interface SourceData {
  sourceId: string;
  sourceName: string;
  files: GTFSFile[];
  summary: any;
  cacheInfo: CacheInfo;
  error?: string;
}

export default function GTFSMultiSourceViewer() {
  const [loading, setLoading] = useState(false);
  const [sourceData, setSourceData] = useState<SourceData[]>([]);
  const [error, setError] = useState<string>('');
  const [sources, setSources] = useState<{ [key: string]: GTFSSource }>({});
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [globalCacheInfo, setGlobalCacheInfo] = useState<CacheInfo | null>(null);

  // Load available sources on component mount
  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    try {
      const response = await fetch('/gtfsStatic?action=sources');
      const data = await response.json();
      
      if (response.ok) {
        setSources(data.sources);
      }
    } catch (err) {
      console.error('Failed to load sources:', err);
    }
  };

  const loadGTFSData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const newSourceData: SourceData[] = [];
      
      // Load data for each selected source
      for (const sourceId of selectedSources) {
        try {
          // Get summary for this source
          const summaryResponse = await fetch(`/gtfsStatic?source=${sourceId}`);
          const summaryData = await summaryResponse.json();
          
          if (!summaryResponse.ok) {
            throw new Error(summaryData.error);
          }
          
          // Load specific files with sample data
          const fileNames = ['stops', 'routes', 'trips', 'calendar', 'stopTimes'];
          const processedFiles: GTFSFile[] = [];
          
          for (const fileName of fileNames) {
            const fileResponse = await fetch(`/gtfsStatic?source=${sourceId}&file=${fileName}`);
            const fileData = await fileResponse.json();
            
            if (fileResponse.ok && fileData.data) {
              processedFiles.push({
                name: fileName,
                data: fileData.data.slice(0, 10), // Show first 10 rows
                count: fileData.count
              });
            }
          }
          
          newSourceData.push({
            sourceId: sourceId,
            sourceName: summaryData.sourceName,
            files: processedFiles,
            summary: summaryData,
            cacheInfo: summaryData.cacheInfo
          });
          
        } catch (sourceError) {
          // Add error for this specific source but continue with others
          newSourceData.push({
            sourceId: sourceId,
            sourceName: sources[sourceId]?.name || sourceId,
            files: [],
            summary: null,
            cacheInfo: { cached: false },
            error: (sourceError as Error).message
          });
        }
      }
      
      setSourceData(newSourceData);
      
    } catch (err) {
      setError('Failed to load GTFS data: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async (action: string) => {
    try {
      let sourceParam = 'all';
      if (action === 'selected') {
        // Clear cache for selected sources
        for (const sourceId of selectedSources) {
          const response = await fetch(`/gtfsStatic?action=clear-cache&source=${sourceId}`);
          if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error);
          }
        }
        alert(`Cache cleared for ${selectedSources.length} selected source(s)`);
      } else {
        // Clear all caches
        const response = await fetch(`/gtfsStatic?action=clear-cache&source=all`);
        const result = await response.json();
        
        if (response.ok) {
          alert(result.message);
        } else {
          throw new Error(result.error);
        }
      }
      
      setError('');
      setGlobalCacheInfo(null);
      setSourceData([]);
      
    } catch (err) {
      setError('Failed to clear cache: ' + (err as Error).message);
    }
  };

  const getCacheInfo = async () => {
    try {
      const response = await fetch('/gtfsStatic?action=cache-info&source=all');
      const info = await response.json();
      setGlobalCacheInfo(info);
    } catch (err) {
      setError('Failed to get cache info: ' + (err as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Multi-Source GTFS Static Data Viewer</h1>
          <p className="text-gray-600 mb-6">Analyze static GTFS data from multiple transit agencies with server-side caching.</p>
        </div>
        
        {/* Source Selection */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Select GTFS Sources (Multiple Selection):</h3>
          <div className="space-y-3">
            {Object.entries(sources).map(([id, source]) => (
              <label key={id} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  value={id}
                  checked={selectedSources.includes(id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedSources([...selectedSources, id]);
                    } else {
                      setSelectedSources(selectedSources.filter(s => s !== id));
                    }
                  }}
                  className="mt-1 h-4 w-4 text-blue-600"
                />
                <div>
                  <div className="font-medium text-gray-800">{source.name}</div>
                  {source.description && (
                    <div className="text-sm text-gray-600">{source.description}</div>
                  )}
                </div>
              </label>
            ))}
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Selected: {selectedSources.length === 0 ? 'None' : selectedSources.map(id => sources[id]?.name).join(', ')}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadGTFSData}
              disabled={loading || selectedSources.length === 0}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium transition-colors"
            >
              {loading ? 'Loading...' : `Load Data (${selectedSources.length} source${selectedSources.length !== 1 ? 's' : ''})`}
            </button>
            
            <button
              onClick={getCacheInfo}
              className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 font-medium transition-colors"
            >
              Check All Caches
            </button>
            
            <button
              onClick={() => clearCache('selected')}
              disabled={selectedSources.length === 0}
              className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium transition-colors"
            >
              Clear Selected Caches
            </button>
            
            <button
              onClick={() => clearCache('all')}
              className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 font-medium transition-colors"
            >
              Clear All Caches
            </button>
          </div>
        </div>

        {/* Global Cache Info */}
        {globalCacheInfo && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Global Cache Status</h3>
            
            {globalCacheInfo.sources ? (
              <div className="space-y-2">
                <p><strong>Total Cached Sources:</strong> {globalCacheInfo.totalSources}</p>
                {globalCacheInfo.sources.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    {globalCacheInfo.sources.map((source: any) => (
                      <div key={source.sourceId} className={`p-3 rounded border ${source.isExpired ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                        <h4 className="font-medium">{source.sourceName} ({source.sourceId})</h4>
                        <p className="text-sm">Last Fetched: {new Date(source.lastFetched).toLocaleString()}</p>
                        <p className="text-sm">Expires: {new Date(source.expiresAt).toLocaleString()}</p>
                        <p className="text-sm"><strong>Status:</strong> {source.isExpired ? 'Expired' : 'Valid'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No sources cached yet</p>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No cache information available</p>
            )}
          </div>
        )}
        
        {error && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Error</h4>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Multi-Source Data Display */}
        {sourceData.length > 0 && (
          <div className="space-y-8">
            {sourceData.map((source) => (
              <div key={source.sourceId} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {source.sourceName} ({source.sourceId})
                  </h2>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    source.error ? 'bg-red-100 text-red-700' : 
                    source.cacheInfo.isExpired ? 'bg-yellow-100 text-yellow-700' : 
                    'bg-green-100 text-green-700'
                  }`}>
                    {source.error ? 'Error' : 
                     source.cacheInfo.isExpired ? 'Cache Expired' : 'Cached'}
                  </div>
                </div>

                {source.error ? (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Failed to load data</h4>
                    <p>{source.error}</p>
                  </div>
                ) : (
                  <>
                    {/* Source Summary */}
                    {source.summary && (
                      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold mb-3">Data Summary</h3>
                        <p className="text-gray-700 mb-3">
                          <strong>Total Records:</strong> {source.summary.totalRecords.toLocaleString()}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {source.summary.summary.map((file: any) => (
                            <div key={file.file} className="bg-white p-3 rounded border">
                              <div className="text-sm text-gray-600 capitalize">{file.file}</div>
                              <div className="text-lg font-semibold text-gray-800">
                                {file.count.toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Source File Tables */}
                    {source.files.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Data Preview</h3>
                        {source.files.map((file) => (
                          <div key={file.name} className="border rounded-lg p-4">
                            <h4 className="text-lg font-medium mb-3 capitalize">
                              {file.name}.txt ({file.count.toLocaleString()} records)
                            </h4>
                            
                            {file.data.length > 0 && (
                              <div className="overflow-x-auto">
                                <table className="min-w-full border border-gray-200 text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      {Object.keys(file.data[0]).map((header) => (
                                        <th key={header} className="px-3 py-2 border text-left font-medium text-xs text-gray-700">
                                          {header}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {file.data.slice(0, 3).map((row, index) => (
                                      <tr key={index} className="border-t hover:bg-gray-50 transition-colors">
                                        {Object.values(row).map((value, cellIndex) => (
                                          <td key={cellIndex} className="px-3 py-2 border text-xs text-gray-600">
                                            {String(value)}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                <p className="text-sm text-gray-500 mt-2">
                                  Showing first 3 of {file.count.toLocaleString()} records
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        
     
        </div>
  );
}