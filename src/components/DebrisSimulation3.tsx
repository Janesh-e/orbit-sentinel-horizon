
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
  className?: string;
  apiEndpoint?: string;
}

const DebrisSimulation3: React.FC<DebrisSimulation3Props> = ({
  selectedSatellite,
  onSelectSatellite,
  className,
  apiEndpoint = 'http://localhost:5000/api/satellites/orbital-elements'
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
  const startTime = useRef(Date.now());

  // Fetch orbital elements from backend
  useEffect(() => {
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
    
    // Refresh data every 60 seconds
    const interval = setInterval(fetchOrbitalElements, 60000);
    return () => clearInterval(interval);
  }, [apiEndpoint]);

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
    if (!canvasRef.current || satellites.length === 0) return;

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

      // Reset hover state
      setHoveredSatellite(null);
      
      // Draw satellites
      satellites.forEach((sat) => {
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
        
        const size = sat.orbitType === 'LEO' ? 6 * zoom.current : 4 * zoom.current;
        const isSelected = selectedSatellite && selectedSatellite.id === sat.id;
        
        // Draw satellite
        context.beginPath();
        context.fillStyle = sat.riskFactor > 60 ? '#ef4444' : '#10b981';
        
        if (isSelected) {
          context.shadowColor = '#3b82f6';
          context.shadowBlur = 15;
          context.arc(screenX, screenY, size * 1.5, 0, Math.PI * 2);
        } else {
          context.shadowBlur = 0;
          context.arc(screenX, screenY, size, 0, Math.PI * 2);
        }
        
        context.fill();
        context.shadowBlur = 0;
        
        // Store screen position for interaction
        (sat as any).screenPosition = { x: screenX, y: screenY, size };
        
        // Draw label for selected satellite
        if (isSelected) {
          context.font = '12px Arial';
          context.fillStyle = '#ffffff';
          context.textAlign = 'center';
          context.fillText(sat.name, screenX, screenY - 20);
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
      
      for (const sat of satellites) {
        const screenPos = (sat as any).screenPosition;
        if (screenPos) {
          const distance = Math.sqrt(
            Math.pow(screenPos.x - x, 2) + 
            Math.pow(screenPos.y - y, 2)
          );
          
          if (distance < screenPos.size + 5) {
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
      zoom.current = Math.max(0.3, Math.min(zoom.current, 3.0));
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
  }, [satellites, selectedSatellite, onSelectSatellite]);

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
          <div>Type: {hoveredSatellite.type}</div>
          <div>Orbit: {hoveredSatellite.orbitType}</div>
          <div>Altitude: {Math.round(hoveredSatellite.altitude)} km</div>
          <div className={hoveredSatellite.riskFactor > 60 ? 'text-red-400' : 'text-green-400'}>
            Risk: {Math.round(hoveredSatellite.riskFactor)}%
          </div>
        </div>
      )}
      
      <div className="absolute bottom-4 left-4 bg-black/60 px-2 py-1 rounded text-xs text-white">
        Satellites: {satellites.length} | Drag to rotate | Scroll to zoom
      </div>
    </div>
  );
};

export default DebrisSimulation3;
