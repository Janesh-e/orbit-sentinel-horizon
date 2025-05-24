
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
          const response = await axios.get(apiEndpoint);
          console.log('Received data:', response.data);
          
          if (!response.data || !Array.isArray(response.data)) {
            throw new Error('Invalid data format received from backend');
          }
          
          setOrbitalElements(response.data);
          setError(null);
          console.log('Successfully loaded', response.data.length, 'orbital elements');
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
