export interface TripStep {
  stepId: string;
  departureStation: string;
  arrivalStation: string;
  departureLocation: string;
  arrivalLocation: string;
  departureTime: string;
  arrivalTime: string;
  scheduledDepartureTime: string;
  scheduledArrivalTime: string;
  delayMinutes: number;
  stepDuration: string;
  transportMode: 'train' | 'bus' | 'tram' ;
  platform?: string;
  track?: string;
}

export interface Trip {
  tripId: string;
  steps: TripStep[];
  totalTravelTime: string;
  timeUntilDeparture: string;
  totalDelayMinutes: number;
}

export interface TripStatus {
  isDelayed: boolean;
  isOnTime: boolean;
  isCancelled: boolean;
  statusMessage: string;
}

export interface TripUpdate {
  timestamp: Date;
  platform?: string;
  actualDepartureTime?: string;
  actualArrivalTime?: string;
  currentLocation?: string;
}

// Helper functions for Trip model
export class TripHelper {
  static isDelayed(trip: Trip): boolean {
    return trip.totalDelayMinutes > 0;
  }

  static getStatusMessage(trip: Trip): string {
    if (trip.totalDelayMinutes > 0) {
      return `Delayed by ${trip.totalDelayMinutes} minutes`;
    }
    return 'On time';
  }

  static formatTravelTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  static getFirstStep(trip: Trip): TripStep | undefined {
    return trip.steps[0];
  }

  static getLastStep(trip: Trip): TripStep | undefined {
    return trip.steps[trip.steps.length - 1];
  }

  static calculateExpectedArrival(trip: Trip): string {
    const lastStep = TripHelper.getLastStep(trip);
    if (!lastStep || lastStep.delayMinutes === 0) {
      return lastStep?.scheduledArrivalTime || '';
    }
    
    // Parse the scheduled time and add delay
    const [hours, minutes] = lastStep.scheduledArrivalTime.split(':').map(Number);
    const scheduledDate = new Date();
    scheduledDate.setHours(hours, minutes + lastStep.delayMinutes, 0, 0);
    
    return scheduledDate.toTimeString().slice(0, 5); // Format as HH:MM
  }
}

// Default trip data
export const defaultTrip: Trip = {
  tripId: '',
  steps: [],
  totalTravelTime: '',
  timeUntilDeparture: '',
  totalDelayMinutes: 0,
};

// Sample data for development/testing
export const sampleTrip: Trip = {
  tripId: 'trip-001',
  steps: [
    {
      stepId: 'step-1',
      departureStation: 'Central Station',
      arrivalStation: 'Metro Junction',
      departureLocation: 'Platform 3',
      arrivalLocation: 'Exit A',
      departureTime: '14:35',
      arrivalTime: '14:55',
      scheduledDepartureTime: '14:30',
      scheduledArrivalTime: '14:50',
      delayMinutes: 5,
      stepDuration: '20 minutes',
      transportMode: 'train',
      platform: '3',
    },
    {
      stepId: 'step-2',
      departureStation: 'Metro Junction',
      arrivalStation: 'Airport Terminal',
      departureLocation: 'Bus Stop B',
      arrivalLocation: 'Terminal 2',
      departureTime: '15:00',
      arrivalTime: '15:25',
      scheduledDepartureTime: '15:00',
      scheduledArrivalTime: '15:25',
      delayMinutes: 0,
      stepDuration: '25 minutes',
      transportMode: 'bus',
      platform: 'B2',
    }
  ],
  totalTravelTime: '50 minutes',
  timeUntilDeparture: '15 minutes',
  totalDelayMinutes: 5,
};