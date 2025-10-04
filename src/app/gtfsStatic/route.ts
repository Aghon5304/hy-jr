import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Fetch the GTFS static data zip file
    const response = await fetch("https://gtfs.ztp.krakow.pl/GTFS_KRK_A.zip", {
    });

    if (!response.ok) {
      const error = new Error(`${response.url}: ${response.status} ${response.statusText}`);
      console.error(error);
      return NextResponse.json(
        { error: 'Failed to fetch GTFS static data' },
        { status: response.status }
      );
    }

    const zipBuffer = await response.arrayBuffer();
    
    // Return the zip file as base64 for client-side processing
    const base64Zip = Buffer.from(zipBuffer).toString('base64');
    
    return NextResponse.json({
      zipData: base64Zip,
      size: zipBuffer.byteLength,
      instructions: {
        usage: 'Use a client-side zip library like JSZip to extract and parse the files',
        example: `
          // Install: npm install jszip
          // Then in your component:
          import JSZip from 'jszip';
          
          const response = await fetch('/api/gtfsStatic');
          const { zipData } = await response.json();
          const zipBuffer = Uint8Array.from(atob(zipData), c => c.charCodeAt(0));
          const zip = new JSZip();
          const contents = await zip.loadAsync(zipBuffer);
          
          // Get stops.txt
          const stopsFile = contents.file('stops.txt');
          if (stopsFile) {
            const csvContent = await stopsFile.async('text');
            const stops = parseCSV(csvContent);
          }
        `
      }
    });

  } catch (error) {
    console.error('Error processing GTFS static data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Simple CSV parser function
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