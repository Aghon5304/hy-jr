import { NextRequest, NextResponse } from 'next/server';
import GtfsRealtimeBindings from "gtfs-realtime-bindings";

export async function GET(
  request: NextRequest,
) {;

  try {
    const response = await fetch("https://gtfs.ztp.krakow.pl/VehiclePositions.pb", {
      headers: {
        "x-api-key": "<redacted>",
        // replace with your GTFS-realtime source's auth token
        // e.g. x-api-key is the header value used for NY's MTA GTFS APIs
      },
    });

    if (!response.ok) {
      const error = new Error(`${response.url}: ${response.status} ${response.statusText}`);
      console.error(error);
      return NextResponse.json(
        { error: 'Failed to fetch GTFS data' },
        { status: response.status }
      );
    }

    const buffer = await response.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer)
    );

    const VehiclePositions: any[] = [];
    feed.entity.forEach((entity) => {
      if (entity.vehicle) {
        VehiclePositions.push(entity.vehicle);
      }
    });

    return NextResponse.json({
      VehiclePositions: VehiclePositions,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}