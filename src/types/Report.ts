export enum DelayReason {
  BREAKDOWN = 'breakdown',
  ACCIDENT = 'accident', 
  TRAFFIC = 'traffic',
  WEATHER = 'weather',
  TECHNICAL = 'technical',
  OTHER = 'other'
}

export interface Report {
  reporterLocation: 'on_vehicle' | 'at_stop';
  coordinates: {
    latitude: number;
    longitude: number;
  };
  
  // When on vehicle
  vehicleNumber?: string;
  delayReason?: DelayReason;
  customReason?: string; // Only when delayReason is DelayReason.OTHER
  
  // When at stop  
  lineNumber?: string;
}