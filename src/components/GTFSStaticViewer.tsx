'use client';

import { useState } from 'react';

// You'll need to install jszip: npm install jszip
// import JSZip from 'jszip';

interface GTFSFile {
  name: string;
  data: any[];
  count: number;
}

export default function GTFSStaticViewer() {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<GTFSFile[]>([]);
  const [error, setError] = useState<string>('');

  const loadGTFSData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/gtfsStatic');
      const { zipData } = await response.json();
      
      // Convert base64 back to binary
      const zipBuffer = Uint8Array.from(atob(zipData), c => c.charCodeAt(0));
      
      // Load zip with JSZip
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const contents = await zip.loadAsync(zipBuffer);
      
      // Process common GTFS files
      const fileNames = ['stops', 'routes', 'trips', 'calendar', 'stop_times'];
      const processedFiles: GTFSFile[] = [];
      
      for (const fileName of fileNames) {
        const file = contents.file(`${fileName}.txt`);
        if (file) {
          const csvContent = await file.async('text');
          const data = parseCSV(csvContent);
          processedFiles.push({
            name: fileName,
            data: data.slice(0, 10), // Show first 10 rows
            count: data.length
          });
        }
      }
      
      setFiles(processedFiles);
      
      // For now, show instructions since JSZip needs to be installed
      setError('Please install jszip first: npm install jszip, then uncomment the code in this component');
      
    } catch (err) {
      setError('Failed to load GTFS data: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">GTFS Static Data Viewer</h1>
      
      <button
        onClick={loadGTFSData}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Load GTFS Static Data'}
      </button>
      
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
                {file.name}.txt ({file.count} records)
              </h2>
              
              {file.data.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(file.data[0]).map((header) => (
                          <th key={header} className="px-4 py-2 border text-left text-sm font-medium">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {file.data.slice(0, 5).map((row, index) => (
                        <tr key={index} className="border-t">
                          {Object.values(row).map((value, cellIndex) => (
                            <td key={cellIndex} className="px-4 py-2 border text-sm">
                              {String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {file.data.length > 5 && (
                    <p className="text-sm text-gray-500 mt-2">
                      Showing first 5 of {file.count} records
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">Setup Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Install JSZip: <code className="bg-gray-200 px-1 rounded">npm install jszip</code></li>
          <li>Uncomment the JSZip import at the top of this file</li>
          <li>Uncomment the zip processing code in the loadGTFSData function</li>
          <li>Click "Load GTFS Static Data" to see the parsed CSV data</li>
        </ol>
      </div>
    </div>
  );
}

// Simple CSV parser function (same as in the API route)
function parseCSV(csvText: string) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index].replace(/"/g, '');
      });
      data.push(row);
    }
  }
  
  return data;
}

// Handle CSV parsing with proper comma and quote handling
function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}