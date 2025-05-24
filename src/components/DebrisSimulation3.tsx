
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
  const startTime = useRef(Date.now());

  // Fetch orbital elements from backend
  useEffect(() => {
    const fetchOrbitalElements = async () => {
      try {
        const response = await axios.get(apiEndpoint);
        setOrbitalElements(response.data);
        console.log('Fetched orbital elements:', response.data.length);
      } catch (error) {
        console.error('Error fetching orbital elements:', error);
      }
    };

    fetchOrbitalElements();
  }, [apiEndpoint]);

  // Convert orbital elements to Cartesian coordinates using Kepler's laws
  const calculatePosition = (elements: OrbitalElements, timeOffset: number): { x: number; y: number; z: number; altitude: number } => {
    const { semiMajorAxis, eccentricity, inclination, rightAscension, argumentOfPerigee, meanAnomaly, meanMotion } = elements;
    
    // Time since epoch in seconds
    const timeSinceEpoch = timeOffset / 1000;
    
    // Current mean anomaly
    const currentMeanAnomaly = meanAnomaly + meanMotion * timeSinceEpoch;
    
    // Solve Kepler's equation for eccentric anomaly (simplified)
    let eccentricAnomaly = currentMeanAnomaly;
    for (let i = 0; i < 5; i++) {
      eccentricAnomaly = currentMeanAnomaly + eccentricity * Math.sin(eccentricAnomaly);
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
    const zOrbital = 0;
    
    // Rotate to Earth-centered inertial frame
    const cosI = Math.cos(inclination);
    const sinI = Math.sin(inclination);
    const cosO = Math.cos(rightAscension);
    const sinO = Math.sin(rightAscension);
    const cosW = Math.cos(argumentOfPerigee);
    const sinW = Math.sin(argumentOfPerigee);
    
    // Rotation matrix elements
    const r11 = cosO * cosW - sinO * sinW * cosI;
    const r12 = -cosO * sinW - sinO * cosW * cosI;
    const r21 = sinO * cosW + cosO * sinW * cosI;
    const r22 = -sinO * sinW + cosO * cosW * cosI;
    const r31 = sinW * sinI;
    const r32 = cosW * sinI;
    
    // Transform to ECI coordinates
    const x = r11 * xOrbital + r12 * yOrbital;
    const y = r21 * xOrbital + r22 * yOrbital;
    const z = r31 * xOrbital + r32 * yOrbital;
    
    const altitude = Math.sqrt(x * x + y * y + z * z) - 6371; // Earth radius
    
    return { x, y, z, altitude };
  };

  // Update satellite positions based on orbital mechanics
  useEffect(() => {
    if (orbitalElements.length === 0) return;

    const updatePositions = () => {
      const currentTime = Date.now();
      const timeOffset = currentTime - startTime.current;
      
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
          inclination: element.inclination * 180 / Math.PI, // Convert to degrees
          altitude: position.altitude
        };
      });
      
      setSatellites(updatedSatellites);
    };

    // Update positions immediately and then every 100ms for smooth animation
    updatePositions();
    const interval = setInterval(updatePositions, 100);

    return () => clearInterval(interval);
  }, [orbitalElements]);

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

    // Draw function for the simulation
    const draw = () => {
      if (!context) return;

      // Clear canvas
      context.fillStyle = 'transparent';
      context.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Earth
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const earthRadius = 30 * zoom.current;

      // Draw orbits
      context.strokeStyle = 'rgba(15, 39, 71, 0.4)';
      context.lineWidth = 1;
      
      for (let i = 1; i <= 4; i++) {
        context.beginPath();
        const orbitRadius = earthRadius + (i * 35 * zoom.current);
        context.ellipse(
          centerX, 
          centerY, 
          orbitRadius, 
          orbitRadius * Math.cos(rotation.current.x * 0.1), 
          rotation.current.x * 0.1, 
          0, 
          2 * Math.PI
        );
        context.stroke();
      }
      
      // Draw Earth
      context.beginPath();
      const gradient = context.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, earthRadius
      );
      gradient.addColorStop(0, '#1148AF');
      gradient.addColorStop(1, '#0B3D91');
      context.fillStyle = gradient;
      context.arc(centerX, centerY, earthRadius, 0, Math.PI * 2);
      context.fill();
      
      // Draw grid lines on the Earth
      context.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      context.lineWidth = 0.5;
      
      // Draw equator
      context.beginPath();
      context.ellipse(
        centerX,
        centerY,
        earthRadius,
        earthRadius * Math.cos(rotation.current.y * 0.1),
        0,
        0,
        Math.PI * 2
      );
      context.stroke();
      
      // Draw prime meridian
      context.beginPath();
      context.ellipse(
        centerX,
        centerY,
        earthRadius,
        earthRadius,
        Math.PI/2 + rotation.current.x * 0.1,
        0,
        Math.PI * 2
      );
      context.stroke();
      
      // Reset hovered satellite
      setHoveredSatellite(null);
      
      // Draw satellites
      satellites.forEach((sat) => {
        // Scale and project 3D position to 2D canvas
        const scale = 0.05 * zoom.current;
        const x3d = sat.x * scale;
        const y3d = sat.y * scale;
        const z3d = sat.z * scale;
        
        // Simple 3D to 2D projection with rotation
        const cosRotX = Math.cos(rotation.current.x * 0.01);
        const sinRotX = Math.sin(rotation.current.x * 0.01);
        const cosRotY = Math.cos(rotation.current.y * 0.01);
        const sinRotY = Math.sin(rotation.current.y * 0.01);
        
        // Rotate around Y axis then X axis
        const x2d = x3d * cosRotY - z3d * sinRotY;
        const y2d = y3d * cosRotX - (x3d * sinRotY + z3d * cosRotY) * sinRotX;
        
        const screenX = centerX + x2d;
        const screenY = centerY + y2d;
        
        // Size based on satellite type and selection
        const size = sat.type === 'satellite' ? 4 * zoom.current : 2 * zoom.current;
        const isSelected = selectedSatellite && selectedSatellite.id === sat.id;
        
        // Draw the satellite
        context.beginPath();
        context.fillStyle = sat.type === 'satellite' 
          ? (sat.riskFactor > 60 ? '#FF710D' : '#00D2FF') 
          : '#AAAAAA';
        
        if (isSelected) {
          // Highlight selected satellite
          context.shadowColor = '#00D2FF';
          context.shadowBlur = 10;
          context.arc(screenX, screenY, size * 1.5, 0, Math.PI * 2);
        } else {
          context.shadowBlur = 0;
          context.arc(screenX, screenY, size, 0, Math.PI * 2);
        }
        
        context.fill();
        context.shadowBlur = 0;
        
        // Store the screen position for click detection
        (sat as any).screenPosition = { x: screenX, y: screenY };
        
        // Draw label for selected satellite
        if (isSelected) {
          context.font = '12px "Space Grotesk"';
          context.fillStyle = '#FFFFFF';
          context.textAlign = 'center';
          context.fillText(sat.name, screenX, screenY - 15);
          
          // Draw connecting line
          context.beginPath();
          context.strokeStyle = '#00D2FF';
          context.moveTo(screenX, screenY);
          context.lineTo(screenX, screenY - 10);
          context.stroke();
        }
        
        // Check if mouse is hovering over this satellite
        if (lastMousePos.current) {
          const dx = screenX - lastMousePos.current.x;
          const dy = screenY - lastMousePos.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 10 * zoom.current) {
            setHoveredSatellite(sat);
            setMousePosition({ x: screenX, y: screenY });
          }
        }
      });
      
      animationRef.current = requestAnimationFrame(draw);
    };

    // Handle click on a satellite
    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Find if any satellite was clicked
      for (const sat of satellites) {
        const screenPos = (sat as any).screenPosition;
        if (screenPos) {
          const distance = Math.sqrt(
            Math.pow(screenPos.x - x, 2) + 
            Math.pow(screenPos.y - y, 2)
          );
          
          if (distance < 10) {
            onSelectSatellite(sat);
            return;
          }
        }
      }
    };

    // Handle mouse down for rotation
    const handleMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    // Handle mouse move for rotation and hover effects
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      lastMousePos.current = { 
        x: e.clientX - rect.left, 
        y: e.clientY - rect.top 
      };
      
      if (!isDragging.current) return;
      
      const deltaX = e.clientX - (rect.left + lastMousePos.current.x);
      const deltaY = e.clientY - (rect.top + lastMousePos.current.y);
      
      rotation.current.x += deltaX * 0.005;
      rotation.current.y += deltaY * 0.005;
    };

    // Handle mouse up to stop rotation
    const handleMouseUp = () => {
      isDragging.current = false;
    };

    // Handle scroll for zoom
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoom.current -= e.deltaY * 0.001;
      zoom.current = Math.max(0.5, Math.min(zoom.current, 2.5));
    };

    // Add event listeners
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // Start the animation
    animationRef.current = requestAnimationFrame(draw);

    // Cleanup function
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
        "relative w-full h-full overflow-hidden rounded-md bg-space-darker space-card",
        className
      )}
    >
      <div className="absolute inset-0 grid-overlay"></div>
      <canvas 
        ref={canvasRef} 
        className="relative z-10 cursor-move"
      />
      {hoveredSatellite && (
        <div 
          className="absolute z-20 bg-space-overlay border border-space-grid rounded-md p-2 text-xs text-gray-200 max-w-[200px]"
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
          {hoveredSatellite.riskFactor && (
            <div className={hoveredSatellite.riskFactor > 60 ? 'text-red-400' : 'text-green-400'}>
              Risk: {Math.round(hoveredSatellite.riskFactor)}%
            </div>
          )}
        </div>
      )}
      <div className="absolute bottom-4 left-4 bg-space-overlay px-2 py-1 rounded text-xs text-gray-300">
        Drag to rotate | Scroll to zoom | Real-time orbital mechanics
      </div>
    </div>
  );
};

export default DebrisSimulation3;
