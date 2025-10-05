// Journey management utilities for saving and tracking trips

export interface SavedJourney {
  id: string;
  fromStop: any;
  toStop: any;
  routeConnections: any[];
  savedAt: string;
  isActive: boolean;
  name?: string;
  showNotification?: boolean;
}

// Local storage keys
const SAVED_JOURNEYS_KEY = 'transit_saved_journeys';
const ACTIVE_JOURNEY_KEY = 'transit_active_journey';

// Save a new journey
export function saveJourney(
  fromStop: any, 
  toStop: any, 
  routeConnections: any[]
): SavedJourney {
  const journey: SavedJourney = {
    id: Date.now().toString(),
    fromStop,
    toStop,
    routeConnections,
    savedAt: new Date().toISOString(),
    isActive: true,
    name: `${fromStop.name} → ${toStop.name}`
  };

  // Get existing journeys
  const existingJourneys = getSavedJourneys();
  
  // Deactivate all other journeys
  const updatedJourneys = existingJourneys.map(j => ({ ...j, isActive: false }));
  
  // Add new journey
  updatedJourneys.push(journey);
  
  // Save to localStorage
  localStorage.setItem(SAVED_JOURNEYS_KEY, JSON.stringify(updatedJourneys));
  localStorage.setItem(ACTIVE_JOURNEY_KEY, journey.id);
  
  console.log('💾 Journey saved:', journey);
  return journey;
}

// Get all saved journeys
export function getSavedJourneys(): SavedJourney[] {
  try {
    const stored = localStorage.getItem(SAVED_JOURNEYS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading saved journeys:', error);
    return [];
  }
}

// Get active journey
export function getActiveJourney(): SavedJourney | null {
  try {
    const activeId = localStorage.getItem(ACTIVE_JOURNEY_KEY);
    if (!activeId) return null;
    
    const journeys = getSavedJourneys();
    return journeys.find(j => j.id === activeId && j.isActive) || null;
  } catch (error) {
    console.error('Error loading active journey:', error);
    return null;
  }
}

// Set active journey
export function setActiveJourney(journeyId: string): void {
  const journeys = getSavedJourneys();
  const updatedJourneys = journeys.map(j => ({
    ...j,
    isActive: j.id === journeyId
  }));
  
  localStorage.setItem(SAVED_JOURNEYS_KEY, JSON.stringify(updatedJourneys));
  localStorage.setItem(ACTIVE_JOURNEY_KEY, journeyId);
}

// Delete a journey
export function deleteJourney(journeyId: string): void {
  const journeys = getSavedJourneys();
  const updatedJourneys = journeys.filter(j => j.id !== journeyId);
  
  localStorage.setItem(SAVED_JOURNEYS_KEY, JSON.stringify(updatedJourneys));
  
  // If deleting active journey, clear active
  const activeId = localStorage.getItem(ACTIVE_JOURNEY_KEY);
  if (activeId === journeyId) {
    localStorage.removeItem(ACTIVE_JOURNEY_KEY);
  }
}

// Check if routes have collisions with delays
export function checkJourneyCollisions(
  journey: SavedJourney, 
  delays: any[]
): any[] {
  if (!delays || delays.length === 0) return [];
  
  const collisions: any[] = [];
  const collisionThreshold = 0.003; // ~300m in degrees
  
  // Function to calculate distance between a point and a line segment
  const distanceToLineSegment = (
    point: {lat: number, lng: number}, 
    lineStart: {lat: number, lng: number}, 
    lineEnd: {lat: number, lng: number}
  ): number => {
    const A = point.lat - lineStart.lat;
    const B = point.lng - lineStart.lng;
    const C = lineEnd.lat - lineStart.lat;
    const D = lineEnd.lng - lineStart.lng;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;
    if (param < 0) {
      xx = lineStart.lat;
      yy = lineStart.lng;
    } else if (param > 1) {
      xx = lineEnd.lat;
      yy = lineEnd.lng;
    } else {
      xx = lineStart.lat + param * C;
      yy = lineStart.lng + param * D;
    }

    const dx = point.lat - xx;
    const dy = point.lng - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  delays.forEach(delay => {
    journey.routeConnections.forEach(route => {
      // Check collision with shape points
      if (route.shapePoints && route.shapePoints.length > 1) {
        for (let i = 0; i < route.shapePoints.length - 1; i++) {
          const distance = distanceToLineSegment(
            delay.location,
            { lat: route.shapePoints[i].lat, lng: route.shapePoints[i].lng },
            { lat: route.shapePoints[i + 1].lat, lng: route.shapePoints[i + 1].lng }
          );
          
          if (distance < collisionThreshold) {
            collisions.push({
              delay: delay,
              route: route,
              distance: distance,
              journey: journey
            });
            break;
          }
        }
      }
    });
  });

  return collisions;
}