
import React from 'react';

interface ControlsOverlayProps {
  filteredSatelliteId: string | null;
  highlightedSatellite: string | null;
  showGridlines: boolean;
  onToggleGridlines: () => void;
  showInstructions: boolean;
  onToggleInstructions: () => void;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
}

const ControlsOverlay: React.FC<ControlsOverlayProps> = ({
  filteredSatelliteId,
  highlightedSatellite,
  showGridlines,
  onToggleGridlines,
  showInstructions,
  onToggleInstructions,
  showHeatmap,
  onToggleHeatmap
}) => {
  return (
    <>
      {/* Enhanced control instructions - toggleable */}
      {showInstructions && (
        <div className="absolute top-4 right-4 bg-black/80 px-4 py-3 rounded-lg text-sm text-white max-w-[280px] z-20">
          <div className="font-semibold mb-2 text-blue-300">🚀 Simulation Controls:</div>
          <div className="space-y-1 text-xs">
            <div>🖱️ <strong>Left-click + drag:</strong> Rotate Earth view</div>
            <div>🔄 <strong>Mouse wheel:</strong> Zoom to cursor (0.1x - 5x)</div>
            <div>👆 <strong>Click satellite:</strong> Select & view details</div>
            <div>🔍 <strong>Search:</strong> Auto-highlight satellites</div>
            <div>👁️ <strong>Filter button:</strong> Show single satellite</div>
            <div>🔥 <strong>Heatmap:</strong> View risk density zones</div>
            {filteredSatelliteId && (
              <div className="mt-2 pt-2 border-t border-gray-600 text-blue-300 font-semibold">
                📍 Currently showing filtered satellite
              </div>
            )}
            {highlightedSatellite && !filteredSatelliteId && (
              <div className="mt-2 pt-2 border-t border-gray-600 text-yellow-300 font-semibold">
                ⭐ Highlighted from search/selection
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Control buttons panel */}
      <div className="absolute top-4 left-4 bg-black/70 px-3 py-2 rounded-lg text-sm text-white flex space-x-4 z-20">
        <button 
          onClick={onToggleGridlines}
          className={`hover:text-blue-300 transition-colors flex items-center space-x-1 ${
            showGridlines ? 'text-blue-300' : 'text-gray-300'
          }`}
        >
          <span>{showGridlines ? '🔲' : '⬜'}</span>
          <span>Grid</span>
        </button>
        
        <button 
          onClick={onToggleInstructions}
          className={`hover:text-blue-300 transition-colors flex items-center space-x-1 ${
            showInstructions ? 'text-blue-300' : 'text-gray-300'
          }`}
        >
          <span>{showInstructions ? '📋' : '📄'}</span>
          <span>Help</span>
        </button>
        
        <button 
          onClick={onToggleHeatmap}
          className={`transition-colors flex items-center space-x-1 ${
            showHeatmap ? 'text-red-400' : 'text-gray-300 hover:text-red-300'
          }`}
        >
          <span>🔥</span>
          <span>Heatmap</span>
        </button>
      </div>
    </>
  );
};

export default ControlsOverlay;
