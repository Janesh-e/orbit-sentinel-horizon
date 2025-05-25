
import { useState, useEffect } from 'react';
import axios from 'axios';

interface SatelliteDetailsData {
  id: number | string;
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

export const useSatelliteDetails = (objectId: string | null) => {
  const [details, setDetails] = useState<SatelliteDetailsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!objectId) {
      setDetails(null);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('Fetching object details for ID:', objectId);
        
        let endpoint = '';
        let cleanId = objectId;
        
        // Determine if this is a satellite or debris based on ID prefix
        if (objectId.startsWith('debris_')) {
          cleanId = objectId.replace('debris_', '');
          endpoint = `http://localhost:5000/api/debris/${cleanId}`;
        } else {
          endpoint = `http://localhost:5000/api/satellite/${objectId}`;
        }
        
        console.log('Using endpoint:', endpoint);
        const response = await axios.get(endpoint);
        console.log('Object details received:', response.data);
        setDetails(response.data);
      } catch (error) {
        console.error('Error fetching object details:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch object details');
        setDetails(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [objectId]);

  return { details, loading, error };
};
