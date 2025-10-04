import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface DelayReport {
  id: string;
  cause: string;
  vehicleNumber: string;
  location: {
    lat: number;
    lng: number;
  };
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    const { cause, vehicleNumber, location } = await request.json();

    // Create new delay report
    const newReport: DelayReport = {
      id: Date.now().toString(),
      cause,
      vehicleNumber,
      location,
      timestamp: new Date().toISOString()
    };

    // Path to delays.json file
    const delaysFilePath = path.join(process.cwd(), 'delays.json');
    
    let existingDelays: DelayReport[] = [];
    
    try {
      // Try to read existing delays
      const fileContent = await fs.readFile(delaysFilePath, 'utf-8');
      existingDelays = JSON.parse(fileContent);
    } catch (error) {
      // File doesn't exist or is empty, start with empty array
      console.log('delays.json not found, creating new file');
    }

    // Add new report to existing delays
    existingDelays.push(newReport);

    // Write back to file
    await fs.writeFile(delaysFilePath, JSON.stringify(existingDelays, null, 2));

    return NextResponse.json({ success: true, id: newReport.id });
  } catch (error) {
    console.error('Error writing delay report:', error);
    return NextResponse.json({ error: 'Failed to save delay report' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const delaysFilePath = path.join(process.cwd(), 'delays.json');
    
    try {
      const fileContent = await fs.readFile(delaysFilePath, 'utf-8');
      const delays: DelayReport[] = JSON.parse(fileContent);
      return NextResponse.json({ delays });
    } catch (error) {
      // File doesn't exist or is empty
      console.log('delays.json not found, returning empty array');
      return NextResponse.json({ delays: [] });
    }
  } catch (error) {
    console.error('Error reading delay reports:', error);
    return NextResponse.json({ error: 'Failed to read delay reports' }, { status: 500 });
  }
}