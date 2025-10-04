'use client';

import { useState } from 'react';

interface GTFSFile {
  name: string;
  data: any[];
  count: number;
}

interface CacheInfo {
  cached: boolean;
  lastFetched?: string;
  expiresAt?: string;
  isExpired?: boolean;
}

export default function GTFSCachedViewer() {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<GTFSFile[]>([]);
  const [error, setError] = useState<string>('');
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [summary, setSummary] = useState<any>(null);

  const loadGTFSData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Get summary first
      const summaryResponse = await fetch('/gtfsStatic');
      const summaryData = await summaryResponse.json();
      
      if (!summaryResponse.ok) {
        throw new Error(summaryData.error);
      }
      
      setSummary(summaryData);
      setCacheInfo(summaryData.cacheInfo);
      
      // Load specific files with sample data
      const fileNames = ['stops', 'routes', 'trips', 'calendar', 'stopTimes'];
      const processedFiles: GTFSFile[] = [];
      
      for (const fileName of fileNames) {
        const fileResponse = await fetch(`/gtfsStatic?file=${fileName}`);
        const fileData = await fileResponse.json();
        
        if (fileResponse.ok && fileData.data) {
          processedFiles.push({
            name: fileName,
            data: fileData.data.slice(0, 10), // Show first 10 rows
            count: fileData.count
          });
        }
      }
      
      setFiles(processedFiles);
      
    } catch (err) {
      setError('Failed to load GTFS data: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async () => {
    try {
      const response = await fetch('/gtfsStatic?action=clear-cache');
      const result = await response.json();
      
      if (response.ok) {
        setError('');
        setCacheInfo(null);
        setSummary(null);
        setFiles([]);
        alert('Cache cleared successfully - reload to fetch fresh data');
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError('Failed to clear cache: ' + (err as Error).message);
    }
  };

  const getCacheInfo = async () => {
    try {
      const response = await fetch('/gtfsStatic?action=cache-info');
      const info = await response.json();
      setCacheInfo(info);
    } catch (err) {
      setError('Failed to get cache info: ' + (err as Error).message);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">GTFS Cached Static Data Viewer</h1>
      
      <div className="flex gap-4 mb-6">
        <button
          onClick={loadGTFSData}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Load GTFS Data'}
        </button>
        
        <button
          onClick={getCacheInfo}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Check Cache
        </button>
        
        <button
          onClick={clearCache}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Clear Cache
        </button>
      </div>

      {/* Cache Info */}
      {cacheInfo && (
        <div className={`mb-6 p-4 rounded-lg ${cacheInfo.cached ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <h3 className="font-semibold mb-2">Cache Status</h3>
          <p><strong>Cached:</strong> {cacheInfo.cached ? 'Yes' : 'No'}</p>
          {cacheInfo.lastFetched && (
            <p><strong>Last Fetched:</strong> {new Date(cacheInfo.lastFetched).toLocaleString()}</p>
          )}
          {cacheInfo.expiresAt && (
            <p><strong>Expires At:</strong> {new Date(cacheInfo.expiresAt).toLocaleString()}</p>
          )}
          {cacheInfo.isExpired !== undefined && (
            <p><strong>Expired:</strong> {cacheInfo.isExpired ? 'Yes' : 'No'}</p>
          )}
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold mb-2">Data Summary</h3>
          <p><strong>Total Records:</strong> {summary.totalRecords.toLocaleString()}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 text-sm">
            {summary.summary.map((file: any) => (
              <div key={file.file} className="flex justify-between">
                <span className="capitalize">{file.file}:</span>
                <span className="font-medium">{file.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {files.length > 0 && (
        <div className="mt-6 space-y-6">
          {files.map((file) => (
            <div key={file.name} className="border rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-2 capitalize">
                {file.name}.txt ({file.count.toLocaleString()} records)
              </h2>
              
              {file.data.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(file.data[0]).map((header) => (
                          <th key={header} className="px-3 py-2 border text-left font-medium">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {file.data.slice(0, 5).map((row, index) => (
                        <tr key={index} className="border-t hover:bg-gray-50">
                          {Object.values(row).map((value, cellIndex) => (
                            <td key={cellIndex} className="px-3 py-2 border">
                              {String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {file.data.length > 5 && (
                    <p className="text-sm text-gray-500 mt-2">
                      Showing first 5 of {file.count.toLocaleString()} records
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}