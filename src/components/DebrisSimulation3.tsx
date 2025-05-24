import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
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

interface DebrisSimulation3Props {
  selectedSatellite: SatellitePosition | null;
  onSelectSatellite: (satellite: SatellitePosition) => void;
  highlightedSatellite?: string | null;
  filteredSatelliteId?: string | null;
  className?: string;
  apiEndpoint?: string;
  satellites?: any[]; // Pass satellites from parent to ensure sync
}

const DebrisSimulation3: React.FC<DebrisSimulation3Props> = ({
  selectedSatellite,
  onSelectSatellite,
  highlightedSatellite,
  filteredSatelliteId,
  className,
  apiEndpoint = 'http://localhost:5000/api/satellites/orbital-elements',
  satellites: propSatellites = []
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const rotation = useRef({ x: 0, y: 0 });
  const zoom = useRef(1);
  const [hoveredSatellite, setHoveredSatellite] = useState<SatellitePosition | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [satellites, setSatellites] = useState<SatellitePosition[]>([]);
  const [orbitalElements, setOrbitalElements] = useState<OrbitalElements[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showGridlines, setShowGridlines] = useState(true);
  const startTime = useRef(Date.now());

  // Use passed satellites or fetch independently
  useEffect(() => {
    if (propSatellites && propSatellites.length > 0) {
      console.log('Using satellites from props:', propSatellites.length);
      setOrbitalElements(propSatellites);
      setError(null);
    } else {
      // Fallback to independent fetching
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

  // Simplified orbital mechanics calculation
  const calculatePosition = (elements: OrbitalElements, timeOffsetSeconds: number): { x: number; y: number; z: number; altitude: number } => {
    try {
      const { semiMajorAxis, eccentricity, inclination, rightAscension, argumentOfPerigee, meanAnomaly, meanMotion } = elements;
      
      // Use current position if available and time offset is small
      if (timeOffsetSeconds < 10 && elements.currentPosition) {
        const { x, y, z } = elements.currentPosition;
        const altitude = Math.sqrt(x * x + y * y + z * z) - 6371;
        return { x, y, z, altitude };
      }
      
      // Calculate current mean anomaly
      const currentMeanAnomaly = meanAnomaly + meanMotion * timeOffsetSeconds;
      
      // Solve Kepler's equation for eccentric anomaly (simplified Newton-Raphson)
      let eccentricAnomaly = currentMeanAnomaly;
      for (let i = 0; i < 8; i++) {
        const f = eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - currentMeanAnomaly;
        const df = 1 - eccentricity * Math.cos(eccentricAnomaly);
        eccentricAnomaly = eccentricAnomaly - f / df;
      }
      
      // True anomaly
      const trueAnomaly = 2 * Math.atan2(
        Math.sqrt(1 + eccentricity) * Math.sin(eccentricAnomaly / 2),
        Math.sqrt(1 - eccentricity) * Math.cos(eccentricAnomaly / 2)
      );
      
      // Distance from Earth center
      const radius = semiMajorAxis * (1 - eccentricity * Math.cos(eccentricAnomaly));
      
      // Position in orbital plane
      const xOrbital = radius * Math.cos(trueAnomaly);
      const yOrbital = radius * Math.sin(trueAnomaly);
      
      // Transform to Earth-centered coordinates
      const cosI = Math.cos(inclination);
      const sinI = Math.sin(inclination);
      const cosO = Math.cos(rightAscension);
      const sinO = Math.sin(rightAscension);
      const cosW = Math.cos(argumentOfPerigee);
      const sinW = Math.sin(argumentOfPerigee);
      
      // Rotation matrix
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
      // Fallback to current position
      if (elements.currentPosition) {
        const { x, y, z } = elements.currentPosition;
        const altitude = Math.sqrt(x * x + y * y + z * z) - 6371;
        return { x, y, z, altitude };
      }
      return { x: 0, y: 0, z: 0, altitude: 0 };
    }
  };

  // Update satellite positions
  useEffect(() => {
    if (orbitalElements.length === 0) return;

    const updatePositions = () => {
      const currentTime = Date.now();
      const timeOffset = (currentTime - startTime.current) / 1000; // seconds
      
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
      console.log('Updated positions for', updatedSatellites.length, 'satellites');
    };

    // Update immediately and then every 1 second
    updatePositions();
    const interval = setInterval(updatePositions, 1000);

    return () => clearInterval(interval);
  }, [orbitalElements]);

  // Canvas drawing and interaction logic
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Set canvas dimensions
    const updateCanvasSize = () => {
      if (containerRef.current) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Draw function
    const draw = () => {
      if (!context) return;

      context.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const earthRadius = 40 * zoom.current;

      // Draw gridlines if enabled
      if (showGridlines) {
        context.strokeStyle = 'rgba(100, 100, 100, 0.3)';
        context.lineWidth = 1;
        
        // Vertical gridlines
        for (let x = 0; x <= canvas.width; x += 50 * zoom.current) {
          context.beginPath();
          context.moveTo(x, 0);
          context.lineTo(x, canvas.height);
          context.stroke();
        }
        
        // Horizontal gridlines
        for (let y = 0; y <= canvas.height; y += 50 * zoom.current) {
          context.beginPath();
          context.moveTo(0, y);
          context.lineTo(canvas.width, y);
          context.stroke();
        }
      }

      // Draw orbital rings
      context.strokeStyle = 'rgba(59, 130, 246, 0.3)';
      context.lineWidth = 1;
      
      for (let i = 1; i <= 3; i++) {
        context.beginPath();
        const orbitRadius = earthRadius + (i * 60 * zoom.current);
        context.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2);
        context.stroke();
      }
      
      // Draw Earth
      context.beginPath();
      const gradient = context.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, earthRadius
      );
      gradient.addColorStop(0, '#2563eb');
      gradient.addColorStop(1, '#1e40af');
      context.fillStyle = gradient;
      context.arc(centerX, centerY, earthRadius, 0, Math.PI * 2);
      context.fill();
      
      // Draw Earth grid
      context.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      context.lineWidth = 1;
      context.beginPath();
      context.arc(centerX, centerY, earthRadius, 0, Math.PI * 2);
      context.stroke();

      // Draw latitude lines on Earth
      for (let lat = -60; lat <= 60; lat += 30) {
        const y = (lat / 90) * earthRadius;
        const width = Math.sqrt(earthRadius * earthRadius - y * y);
        context.beginPath();
        context.ellipse(centerX, centerY + y, width, width * 0.3, 0, 0, Math.PI * 2);
        context.stroke();
      }

      // Draw longitude lines on Earth
      for (let lng = 0; lng < 180; lng += 30) {
        context.beginPath();
        context.ellipse(centerX, centerY, earthRadius, earthRadius * 0.3, (lng * Math.PI) / 180, 0, Math.PI * 2);
        context.stroke();
      }

      // Reset hover state
      setHoveredSatellite(null);
      
      // Filter satellites if needed
      const satellitesToDraw = filteredSatelliteId 
        ? satellites.filter(sat => sat.id === filteredSatelliteId)
        : satellites;
      
      console.log('Drawing satellites:', satellitesToDraw.length, 'highlighted:', highlightedSatellite, 'filtered:', filteredSatelliteId);
      
      // Draw satellites
      satellitesToDraw.forEach((sat) => {
        // Project 3D position to 2D
        const scale = 0.02 * zoom.current;
        const x3d = sat.x * scale;
        const y3d = sat.y * scale;
        const z3d = sat.z * scale;
        
        // Simple rotation
        const cosRotX = Math.cos(rotation.current.x * 0.01);
        const sinRotX = Math.sin(rotation.current.x * 0.01);
        const cosRotY = Math.cos(rotation.current.y * 0.01);
        const sinRotY = Math.sin(rotation.current.y * 0.01);
        
        const x2d = x3d * cosRotY - z3d * sinRotY;
        const y2d = y3d * cosRotX - (x3d * sinRotY + z3d * cosRotY) * sinRotX;
        
        const screenX = centerX + x2d;
        const screenY = centerY + y2d;
        
        // Check if satellite is visible (in front)
        const z2d = x3d * sinRotY + z3d * cosRotY;
        if (z2d < -1000) return; // Behind Earth, don't draw
        
        const isSelected = selectedSatellite && selectedSatellite.id === sat.id;
        const isHighlighted = highlightedSatellite === sat.id;
        const isFiltered = filteredSatelliteId === sat.id;
        
        let size = sat.orbitType === 'LEO' ? 6 * zoom.current : 4 * zoom.current;
        
        // Increase size for highlighted/filtered satellites
        if (isHighlighted || isFiltered) {
          size *= 1.5;
        }
        
        // Draw satellite trail for highlighted satellites
        if (isHighlighted || isFiltered) {
          context.strokeStyle = 'rgba(59, 130, 246, 0.5)';
          context.lineWidth = 2;
          context.beginPath();
          // Simple trail effect - could be enhanced with orbital path calculation
          const trailLength = 30;
          for (let i = 0; i < trailLength; i++) {
            const trailAlpha = (trailLength - i) / trailLength;
            context.globalAlpha = trailAlpha * 0.5;
            const trailX = screenX - (i * 2);
            const trailY = screenY - (i * 1);
            if (i === 0) {
              context.moveTo(trailX, trailY);
            } else {
              context.lineTo(trailX, trailY);
            }
          }
          context.stroke();
          context.globalAlpha = 1;
        }
        
        // Draw satellite
        context.beginPath();
        
        if (isHighlighted || isFiltered) {
          context.fillStyle = '#3b82f6'; // Blue for highlighted/filtered
        } else if (sat.riskFactor > 60) {
          context.fillStyle = '#ef4444'; // Red for high risk
        } else {
          context.fillStyle = '#10b981'; // Green for normal
        }
        
        if (isSelected) {
          context.shadowColor = '#3b82f6';
          context.shadowBlur = 15;
          context.arc(screenX, screenY, size * 1.2, 0, Math.PI * 2);
        } else {
          context.shadowBlur = 0;
          context.arc(screenX, screenY, size, 0, Math.PI * 2);
        }
        
        context.fill();
        context.shadowBlur = 0;
        
        // Store screen position for interaction
        (sat as any).screenPosition = { x: screenX, y: screenY, size };
        
        // Draw label for selected, highlighted, or filtered satellite
        if (isSelected || isHighlighted || isFiltered) {
          context.font = '12px Arial';
          context.fillStyle = '#ffffff';
          context.textAlign = 'center';
          context.fillText(sat.name, screenX, screenY - 25);
          
          // Draw additional info for highlighted satellites
          if (isHighlighted || isFiltered) {
            context.font = '10px Arial';
            context.fillText(`Alt: ${Math.round(sat.altitude)}km`, screenX, screenY - 10);
            context.fillText(`ID: ${sat.id}`, screenX, screenY + 25);
          }
        }
        
        // Check for hover
        if (lastMousePos.current) {
          const dx = screenX - lastMousePos.current.x;
          const dy = screenY - lastMousePos.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < size + 5) {
            setHoveredSatellite(sat);
            setMousePosition({ x: screenX, y: screenY });
          }
        }
      });
      
      animationRef.current = requestAnimationFrame(draw);
    };

    // Event handlers
    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const satellitesToCheck = filteredSatelliteId 
        ? satellites.filter(sat => sat.id === filteredSatelliteId)
        : satellites;
      
      for (const sat of satellitesToCheck) {
        const screenPos = (sat as any).screenPosition;
        if (screenPos) {
          const distance = Math.sqrt(
            Math.pow(screenPos.x - x, 2) + 
            Math.pow(screenPos.y - y, 2)
          );
          
          if (distance < screenPos.size + 5) {
            console.log('Clicked on satellite in simulation:', sat.id, sat.name);
            onSelectSatellite(sat);
            return;
          }
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      lastMousePos.current = { 
        x: e.clientX - rect.left, 
        y: e.clientY - rect.top 
      };
      
      if (!isDragging.current) return;
      
      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;
      
      rotation.current.x += deltaX * 0.005;
      rotation.current.y += deltaY * 0.005;
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoom.current -= e.deltaY * 0.001;
      // Extended zoom range
      zoom.current = Math.max(0.1, Math.min(zoom.current, 10.0));
    };

    // Add event listeners
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // Start animation
    animationRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', updateCanvasSize);
      canvas.removeEventListener('click', handleCanvasClick);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [satellites, selectedSatellite, onSelectSatellite, highlightedSatellite, filteredSatelliteId, showGridlines]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-hidden rounded-md bg-gray-900",
        className
      )}
    >
      <canvas 
        ref={canvasRef} 
        className="relative z-10 cursor-move"
      />
      
      {error && (
        <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded text-sm">
          Error: {error}
        </div>
      )}
      
      {hoveredSatellite && (
        <div 
          className="absolute z-20 bg-black/80 border border-gray-600 rounded-md p-2 text-xs text-white max-w-[200px] pointer-events-none"
          style={{ 
            left: mousePosition.x + 15, 
            top: mousePosition.y - 15,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="font-semibold">{hoveredSatellite.name}</div>
          <div>ID: {hoveredSatellite.id}</div>
          <div>Type: {hoveredSatellite.type}</div>
          <div>Orbit: {hoveredSatellite.orbitType}</div>
          <div>Altitude: {Math.round(hoveredSatellite.altitude)} km</div>
          <div className={hoveredSatellite.riskFactor > 60 ? 'text-red-400' : 'text-green-400'}>
            Risk: {Math.round(hoveredSatellite.riskFactor)}%
          </div>
        </div>
      )}
      
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
          onClick={() => setShowGridlines(!showGridlines)}
          className="hover:text-blue-300 transition-colors"
        >
          {showGridlines ? '🔲' : '⬜'} Grid: {showGridlines ? 'ON' : 'OFF'}
        </button>
      </div>
      
      <div className="absolute bottom-4 left-4 bg-black/70 px-2 py-1 rounded text-xs text-white">
        <div>📡 Satellites: {filteredSatelliteId ? '1 (filtered)' : satellites.length}</div>
        {highlightedSatellite && (
          <div>⭐ Highlighted: {satellites.find(s => s.id === highlightedSatellite)?.name || highlightedSatellite}</div>
        )}
        <div>🔄 Live tracking: {satellites.length > 0 ? 'Active' : 'Loading...'}</div>
        <div>🔍 Zoom: {zoom.current.toFixed(1)}x</div>
      </div>
    </div>
  );
};

export default DebrisSimulation3;
