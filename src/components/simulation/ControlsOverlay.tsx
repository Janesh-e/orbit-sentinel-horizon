
import React from 'react';

interface ControlsOverlayProps {
  filteredSatelliteId: string | null;
  highlightedSatellite: string | null;
  showGridlines: boolean;
  onToggleGridlines: () => void;
}

const ControlsOverlay: React.FC<ControlsOverlayProps> = ({
  filteredSatelliteId,
  highlightedSatellite,
  showGridlines,
  onToggleGridlines
}) => {
  return (
    <>
      {/* Enhanced control instructions */}
      <div className="absolute top-4 right-4 bg-black/70 px-3 py-2 rounded text-xs text-white max-w-[250px]">
        <div className="font-semibold mb-1">🚀 Simulation Controls:</div>
        <div>🖱️ <strong>Left-click + drag:</strong> Rotate Earth view</div>
        <div>🔄 <strong>Mouse wheel:</strong> Zoom in/out (0.1x - 10x)</div>
        <div>👆 <strong>Click satellite:</strong> Select & view details</div>
        <div>🔍 <strong>Search:</strong> Auto-highlight satellites</div>
        <div>👁️ <strong>Filter button:</strong> Show single satellite</div>
        {filteredSatelliteId && (
          <div className="mt-1 text-blue-300 font-semibold">
            📍 Currently showing filtered satellite
          </div>
        )}
        {highlightedSatellite && !filteredSatelliteId && (
          <div className="mt-1 text-yellow-300 font-semibold">
            ⭐ Highlighted from search/selection
          </div>
        )}
      </div>
      
      {/* Gridlines toggle */}
      <div className="absolute top-4 left-4 bg-black/60 px-2 py-1 rounded text-xs text-white">
        <button 
          onClick={onToggleGridlines}
          className="hover:text-blue-300 transition-colors"
        >
          {showGridlines ? '🔲' : '⬜'} Grid: {showGridlines ? 'ON' : 'OFF'}
        </button>
      </div>
    </>
  );
};

export default ControlsOverlay;
