'use client';

import { useState, useEffect } from 'react';

interface GTFSFile {
  name: string;
  data: any[];
  count: number;
}

interface SourceData {
  [source: string]: GTFSFile[];
}

export default function GTFSMultiSourceViewer() {
  const [loading, setLoading] = useState(false);
  const [sourcesData, setSourcesData] = useState<SourceData>({});
  const [error, setError] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('');

  const sources = ['krakow1', 'krakow2', 'krakow3', 'ald', 'kml'];

  const loadAllSources = async () => {
    setLoading(true);
    setError('');
    setSourcesData({});
    
    try {
      const allSourcesData: SourceData = {};
      
      for (const source of sources) {
        console.log(`Loading source: ${source}`);
        try {
          // Load basic file info for each source
          const fileNames = ['stops', 'routes', 'trips', 'stop_times'];
          const sourceFiles: GTFSFile[] = [];
          
          for (const fileName of fileNames) {
            try {
              const response = await fetch(`/api/gtfsStatic?source=${source}&file=${fileName}`);
              if (response.ok) {
                const data = await response.json();
                const records = data.data || [];
                sourceFiles.push({
                  name: fileName,
                  data: records.slice(0, 5), // Show first 5 rows
                  count: records.length
                });
                console.log(`✅ ${source}/${fileName}: ${records.length} records`);
              } else {
                console.log(`❌ ${source}/${fileName}: Failed to load`);
              }
            } catch (fileError) {
              console.error(`Error loading ${source}/${fileName}:`, fileError);
            }
          }
          
          allSourcesData[source] = sourceFiles;
          
        } catch (sourceError) {
          console.error(`Error loading source ${source}:`, sourceError);
          allSourcesData[source] = [];
        }
      }
      
      setSourcesData(allSourcesData);
      
      // Set first available source as selected
      const availableSources = Object.keys(allSourcesData).filter(
        source => allSourcesData[source].length > 0
      );
      if (availableSources.length > 0) {
        setSelectedSource(availableSources[0]);
      }
      
    } catch (err) {
      setError('Failed to load GTFS sources: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllSources();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">GTFS Multi-Source Viewer</h1>
      
      <button
        onClick={loadAllSources}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 mb-4"
      >
        {loading ? 'Loading...' : 'Reload All Sources'}
      </button>
      
      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {/* Source Tabs */}
      {Object.keys(sourcesData).length > 0 && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {Object.keys(sourcesData).map((source) => (
              <button
                key={source}
                onClick={() => setSelectedSource(source)}
                className={`px-4 py-2 rounded ${
                  selectedSource === source
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {source.toUpperCase()} ({sourcesData[source].length} files)
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Selected Source Data */}
      {selectedSource && sourcesData[selectedSource] && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">
            Source: {selectedSource.toUpperCase()}
          </h2>
          
          {sourcesData[selectedSource].map((file) => (
            <div key={file.name} className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2 capitalize">
                {file.name}.txt ({file.count.toLocaleString()} records)
              </h3>
              
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
                      {file.data.map((row, index) => (
                        <tr key={index} className="border-t">
                          {Object.values(row).map((value, cellIndex) => (
                            <td key={cellIndex} className="px-3 py-2 border">
                              {String(value).length > 50 
                                ? String(value).substring(0, 50) + '...'
                                : String(value)
                              }
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-sm text-gray-500 mt-2">
                    Showing first {file.data.length} of {file.count.toLocaleString()} records
                  </p>
                </div>
              )}
              
              {file.data.length === 0 && (
                <p className="text-gray-500 italic">No data available</p>
              )}
            </div>
          ))}
          
          {sourcesData[selectedSource].length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No files loaded for source: {selectedSource}</p>
            </div>
          )}
        </div>
      )}
      
      {Object.keys(sourcesData).length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          <p>No sources loaded. Click "Reload All Sources" to fetch data.</p>
        </div>
      )}
      
      {/* Summary */}
      {Object.keys(sourcesData).length > 0 && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Sources Summary:</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
            {Object.entries(sourcesData).map(([source, files]) => (
              <div key={source} className="text-center">
                <div className="font-medium">{source.toUpperCase()}</div>
                <div className="text-gray-600">{files.length} files</div>
                <div className="text-xs text-gray-500">
                  {files.reduce((total, file) => total + file.count, 0).toLocaleString()} records
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}