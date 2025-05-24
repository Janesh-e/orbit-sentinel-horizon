
import React from 'react';

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

interface SatelliteTooltipProps {
  satellite: SatellitePosition;
  position: { x: number; y: number };
}

const SatelliteTooltip: React.FC<SatelliteTooltipProps> = ({ satellite, position }) => {
  return (
    <div 
      className="absolute z-20 bg-black/80 border border-gray-600 rounded-md p-2 text-xs text-white max-w-[200px] pointer-events-none"
      style={{ 
        left: position.x + 15, 
        top: position.y - 15,
        transform: 'translateY(-100%)'
      }}
    >
      <div className="font-semibold">{satellite.name}</div>
      <div>ID: {satellite.id}</div>
      <div>Type: {satellite.type}</div>
      <div>Orbit: {satellite.orbitType}</div>
      <div>Altitude: {Math.round(satellite.altitude)} km</div>
      <div className={satellite.riskFactor > 60 ? 'text-red-400' : 'text-green-400'}>
        Risk: {Math.round(satellite.riskFactor)}%
      </div>
    </div>
  );
};

export default SatelliteTooltip;
