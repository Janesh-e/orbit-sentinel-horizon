
import { useState, useEffect } from 'react';
import axios from 'axios';

interface OrbitalElements {
  id: string;
  name: string;
  semiMajorAxis: number;
  eccentricity: number;
  inclination: number;
  rightAscension: number;
  argumentOfPerigee: number;
  meanAnomaly: number;
  meanMotion: number;
  period: number;
  epoch: number;
  currentPosition: { x: number; y: number; z: number };
  type: string;
  orbitType: 'LEO' | 'MEO' | 'GEO' | 'HEO';
  riskFactor: number;
  noradId: number;
}

export const useSatelliteData = (apiEndpoint: string, propSatellites: any[] = []) => {
  const [orbitalElements, setOrbitalElements] = useState<OrbitalElements[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (propSatellites && propSatellites.length > 0) {
      console.log('Using satellites from props:', propSatellites.length);
      setOrbitalElements(propSatellites);
      setError(null);
    } else {
      const fetchOrbitalElements = async () => {
        try {
          console.log('Fetching orbital elements from:', apiEndpoint);
          
          // Fetch both satellites and debris data
          const [satelliteResponse, debrisResponse] = await Promise.all([
            axios.get('http://localhost:5000/api/satellites/orbital-elements'),
            axios.get('http://localhost:5000/api/debris/orbital-elements')
          ]);
          
          console.log('Received satellite data:', satelliteResponse.data.length);
          console.log('Received debris data:', debrisResponse.data.length);
          
          if (!satelliteResponse.data || !Array.isArray(satelliteResponse.data) ||
              !debrisResponse.data || !Array.isArray(debrisResponse.data)) {
            throw new Error('Invalid data format received from backend');
          }
          
          // Process satellite data
          const processedSatellites = satelliteResponse.data.map((sat: any) => ({
            ...sat,
            type: 'satellite'
          }));
          
          // Process debris data with unique IDs
          const processedDebris = debrisResponse.data.map((debris: any) => ({
            ...debris,
            id: `debris_${debris.id}`, // Prefix to avoid ID conflicts
            type: 'debris'
          }));
          
          // Combine both datasets
          const combinedData = [...processedSatellites, ...processedDebris];
          
          setOrbitalElements(combinedData);
          setError(null);
          console.log('Successfully loaded', combinedData.length, 'orbital elements (', 
                     processedSatellites.length, 'satellites,', processedDebris.length, 'debris)');
        } catch (error) {
          console.error('Error fetching orbital elements:', error);
          setError(error instanceof Error ? error.message : 'Failed to fetch data');
        }
      };

      fetchOrbitalElements();
      const interval = setInterval(fetchOrbitalElements, 60000);
      return () => clearInterval(interval);
    }
  }, [apiEndpoint, propSatellites]);

  return { orbitalElements, error };
};
