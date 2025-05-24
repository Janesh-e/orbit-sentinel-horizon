
import { useState, useEffect } from 'react';
import axios from 'axios';

interface SatelliteDetailsData {
  id: number;
  name: string;
  type: string;
  launchDate: string | null;
  riskFactor: number;
  lastUpdated: string;
  orbitType: string;
  altitude_km: number;
  inclination_deg: number;
  velocity_km_s: number;
  tle: {
    line1: string;
    line2: string;
  };
}

export const useSatelliteDetails = (satelliteId: string | null) => {
  const [details, setDetails] = useState<SatelliteDetailsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!satelliteId) {
      setDetails(null);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('Fetching satellite details for ID:', satelliteId);
        const response = await axios.get(`http://localhost:5000/api/satellite/${satelliteId}`);
        console.log('Satellite details received:', response.data);
        setDetails(response.data);
      } catch (error) {
        console.error('Error fetching satellite details:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch satellite details');
        setDetails(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [satelliteId]);

  return { details, loading, error };
};
