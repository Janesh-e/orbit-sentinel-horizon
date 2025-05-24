
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

interface StatusOverlayProps {
  satellites: SatellitePosition[];
  filteredSatelliteId: string | null;
  highlightedSatellite: string | null;
  zoom: number;
}

const StatusOverlay: React.FC<StatusOverlayProps> = ({
  satellites,
  filteredSatelliteId,
  highlightedSatellite,
  zoom
}) => {
  return (
    <div className="absolute bottom-4 left-4 bg-black/70 px-2 py-1 rounded text-xs text-white">
      <div>📡 Satellites: {filteredSatelliteId ? '1 (filtered)' : satellites.length}</div>
      {highlightedSatellite && (
        <div>⭐ Highlighted: {satellites.find(s => s.id === highlightedSatellite)?.name || highlightedSatellite}</div>
      )}
      <div>🔄 Live tracking: {satellites.length > 0 ? 'Active' : 'Loading...'}</div>
      <div>🔍 Zoom: {zoom.toFixed(1)}x</div>
    </div>
  );
};

export default StatusOverlay;
