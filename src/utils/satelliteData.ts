
// Mock satellite and debris data for simulation

export interface SatelliteData {
  id: string;
  name: string;
  type: 'satellite' | 'debris';
  size: number;
  altitude: number; // km
  inclination: number; // degrees
  velocity: number; // km/s
  position: {
    x: number;
    y: number;
    z: number;
  };
  launchDate?: string;
  country?: string;
  tleData?: string[];
  riskFactor: number; // 0-100 - Made required to match usage
  collisionProbability?: number; // 0-1
  lastUpdated: string;
  orbitType: 'LEO' | 'MEO' | 'GEO' | 'HEO';
}

export interface ConjunctionEvent {
  id: string;
  time: string;
  primaryObject: string;
  secondaryObject: string;
  distance: number; // km
  probability: number; // 0-1
  timeToClosestApproach: string; // HH:MM:SS
  relativeVelocity: number; // km/s
  isResolved: boolean;
  actionTaken?: string;
}

// Generate some mock satellites
export const generateSatellites = (count: number): SatelliteData[] => {
  const satellites: SatelliteData[] = [];
  const orbitTypes: ('LEO' | 'MEO' | 'GEO' | 'HEO')[] = ['LEO', 'MEO', 'GEO', 'HEO'];
  const countries = ['USA', 'Russia', 'China', 'EU', 'India', 'Japan'];
  
  for (let i = 0; i < count; i++) {
    const isSatellite = Math.random() > 0.7; // 30% are satellites, rest are debris
    satellites.push({
      id: `OBJ-${(10000 + i).toString()}`,
      name: isSatellite ? `Satellite-${i + 1}` : `Debris-${i + 1}`,
      type: isSatellite ? 'satellite' : 'debris',
      size: isSatellite ? Math.random() * 10 + 2 : Math.random() * 0.5 + 0.1,
      altitude: Math.random() * 35000 + 300,
      inclination: Math.random() * 180,
      velocity: Math.random() * 3 + 5,
      position: {
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
        z: Math.random() * 2 - 1,
      },
      launchDate: isSatellite ? new Date(2000 + Math.floor(Math.random() * 23), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)).toISOString().split('T')[0] : undefined,
      country: isSatellite ? countries[Math.floor(Math.random() * countries.length)] : undefined,
      tleData: isSatellite ? [
        `1 25544U 98067A   22125.22478650  .00006910  00000+0  13016-3 0  9996`,
        `2 25544  51.6449 336.4797 0005211   3.5234  87.9885 15.49557277342434`
      ] : undefined,
      riskFactor: Math.random() * 100,
      collisionProbability: Math.random() * 0.01, // 0-1% probability
      lastUpdated: new Date().toISOString(),
      orbitType: orbitTypes[Math.floor(Math.random() * orbitTypes.length)],
    });
  }
  
  return satellites;
};

// Generate conjunction events
export const generateConjunctionEvents = (satellites: SatelliteData[], count: number): ConjunctionEvent[] => {
  const events: ConjunctionEvent[] = [];
  
  for (let i = 0; i < count; i++) {
    const primaryIndex = Math.floor(Math.random() * satellites.length);
    let secondaryIndex = Math.floor(Math.random() * satellites.length);
    
    // Ensure we don't have the same object for both primary and secondary
    while (secondaryIndex === primaryIndex) {
      secondaryIndex = Math.floor(Math.random() * satellites.length);
    }
    
    // Generate a random date in the next 7 days
    const date = new Date();
    date.setDate(date.getDate() + Math.random() * 7);
    
    events.push({
      id: `CONJ-${(1000 + i).toString()}`,
      time: date.toISOString(),
      primaryObject: satellites[primaryIndex].id,
      secondaryObject: satellites[secondaryIndex].id,
      distance: Math.random() * 10 + 0.1, // 0.1 - 10.1 km
      probability: Math.random() * 0.05, // 0-5% probability
      timeToClosestApproach: `${Math.floor(Math.random() * 24).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
      relativeVelocity: Math.random() * 10 + 5, // 5-15 km/s
      isResolved: Math.random() > 0.7, // 30% are resolved
      actionTaken: Math.random() > 0.5 ? 'Orbit adjustment' : undefined,
    });
  }
  
  // Sort by time
  events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  return events;
};

// Create dataset for stats
export const satelliteStats = {
  orbitDistribution: {
    LEO: 67,
    MEO: 18,
    GEO: 12,
    HEO: 3,
  },
  typeDistribution: {
    active: 45,
    inactive: 15,
    debris: 40,
  },
  riskTrend: [
    { date: '2023-01', value: 42 },
    { date: '2023-02', value: 44 },
    { date: '2023-03', value: 47 },
    { date: '2023-04', value: 46 },
    { date: '2023-05', value: 52 },
    { date: '2023-06', value: 54 },
    { date: '2023-07', value: 51 },
    { date: '2023-08', value: 56 },
    { date: '2023-09', value: 58 },
    { date: '2023-10', value: 62 },
    { date: '2023-11', value: 64 },
    { date: '2023-12', value: 67 },
  ],
  conjunctionsByMonth: [
    { month: 'Jan', count: 12 },
    { month: 'Feb', count: 15 },
    { month: 'Mar', count: 18 },
    { month: 'Apr', count: 22 },
    { month: 'May', count: 19 },
    { month: 'Jun', count: 23 },
    { month: 'Jul', count: 27 },
    { month: 'Aug', count: 25 },
    { month: 'Sep', count: 31 },
    { month: 'Oct', count: 34 },
    { month: 'Nov', count: 37 },
    { month: 'Dec', count: 42 },
  ],
};

export const generateInitialData = () => {
  const satellites = generateSatellites(250);
  const conjunctions = generateConjunctionEvents(satellites, 30);
  return { satellites, conjunctions };
};
