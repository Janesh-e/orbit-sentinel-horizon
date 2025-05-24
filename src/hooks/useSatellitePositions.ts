
import { useState, useEffect, useRef } from 'react';

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

interface SatellitePosition {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  type: string;
  orbitType: 'LEO' | 'MEO' | 'GEO' | 'HEO';
  riskFactor: number;
  inclination: number;
  altitude: number;
}

export const useSatellitePositions = (orbitalElements: OrbitalElements[]) => {
  const [satellites, setSatellites] = useState<SatellitePosition[]>([]);
  const startTime = useRef(Date.now());

  const calculatePosition = (elements: OrbitalElements, timeOffsetSeconds: number): { x: number; y: number; z: number; altitude: number } => {
    try {
      const { semiMajorAxis, eccentricity, inclination, rightAscension, argumentOfPerigee, meanAnomaly, meanMotion } = elements;
      
      if (timeOffsetSeconds < 10 && elements.currentPosition) {
        const { x, y, z } = elements.currentPosition;
        const altitude = Math.sqrt(x * x + y * y + z * z) - 6371;
        return { x, y, z, altitude };
      }
      
      const currentMeanAnomaly = meanAnomaly + meanMotion * timeOffsetSeconds;
      
      let eccentricAnomaly = currentMeanAnomaly;
      for (let i = 0; i < 8; i++) {
        const f = eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - currentMeanAnomaly;
        const df = 1 - eccentricity * Math.cos(eccentricAnomaly);
        eccentricAnomaly = eccentricAnomaly - f / df;
      }
      
      const trueAnomaly = 2 * Math.atan2(
        Math.sqrt(1 + eccentricity) * Math.sin(eccentricAnomaly / 2),
        Math.sqrt(1 - eccentricity) * Math.cos(eccentricAnomaly / 2)
      );
      
      const radius = semiMajorAxis * (1 - eccentricity * Math.cos(eccentricAnomaly));
      
      const xOrbital = radius * Math.cos(trueAnomaly);
      const yOrbital = radius * Math.sin(trueAnomaly);
      
      const cosI = Math.cos(inclination);
      const sinI = Math.sin(inclination);
      const cosO = Math.cos(rightAscension);
      const sinO = Math.sin(rightAscension);
      const cosW = Math.cos(argumentOfPerigee);
      const sinW = Math.sin(argumentOfPerigee);
      
      const r11 = cosO * cosW - sinO * sinW * cosI;
      const r12 = -cosO * sinW - sinO * cosW * cosI;
      const r21 = sinO * cosW + cosO * sinW * cosI;
      const r22 = -sinO * sinW + cosO * cosW * cosI;
      const r31 = sinW * sinI;
      const r32 = cosW * sinI;
      
      const x = r11 * xOrbital + r12 * yOrbital;
      const y = r21 * xOrbital + r22 * yOrbital;
      const z = r31 * xOrbital + r32 * yOrbital;
      
      const altitude = Math.sqrt(x * x + y * y + z * z) - 6371;
      
      return { x, y, z, altitude };
    } catch (error) {
      console.error('Error calculating position for satellite:', elements.name, error);
      if (elements.currentPosition) {
        const { x, y, z } = elements.currentPosition;
        const altitude = Math.sqrt(x * x + y * y + z * z) - 6371;
        return { x, y, z, altitude };
      }
      return { x: 0, y: 0, z: 0, altitude: 0 };
    }
  };

  useEffect(() => {
    if (orbitalElements.length === 0) return;

    const updatePositions = () => {
      const currentTime = Date.now();
      const timeOffset = (currentTime - startTime.current) / 1000;
      
      const updatedSatellites = orbitalElements.map(element => {
        const position = calculatePosition(element, timeOffset);
        
        return {
          id: element.id,
          name: element.name,
          x: position.x,
          y: position.y,
          z: position.z,
          type: element.type,
          orbitType: element.orbitType,
          riskFactor: element.riskFactor,
          inclination: element.inclination * 180 / Math.PI,
          altitude: position.altitude
        };
      });
      
      setSatellites(updatedSatellites);
    };

    updatePositions();
    const interval = setInterval(updatePositions, 1000);

    return () => clearInterval(interval);
  }, [orbitalElements]);

  return satellites;
};
