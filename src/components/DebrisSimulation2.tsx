
import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { SatelliteData } from '@/utils/satelliteData';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FlaskSatelliteData {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  inclination: number;
  type: "satellite" | "debris";
  orbitType: string;
  riskFactor: number | null;
  position?: { x: number; y: number; z: number };
  altitude?: number;
}

interface DebrisSimulationProps {
  selectedSatellite: FlaskSatelliteData | null;
  className?: string;
  onSelectSatellite: (satellite: FlaskSatelliteData) => void;
  apiEndpoint?: string;
}

const DebrisSimulation2: React.FC<DebrisSimulationProps> = ({
  selectedSatellite,
  className,
  onSelectSatellite,
  apiEndpoint = '/api/satellites' // Default endpoint, can be overridden via props
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const rotation = useRef({ x: 0, y: 0 });
  const zoom = useRef(1);
  const [hoveredSatellite, setHoveredSatellite] = useState<FlaskSatelliteData | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [satellites, setSatellites] = useState<FlaskSatelliteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from Flask backend
  useEffect(() => {
    const fetchSatelliteData = async () => {
      try {
        setLoading(true);
        const response = await fetch(apiEndpoint);
        
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        setSatellites(data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch satellite data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setLoading(false);
      }
    };

    fetchSatelliteData();
    
    // Set up a polling interval to refresh data (e.g., every 60 seconds)
    const intervalId = setInterval(fetchSatelliteData, 60000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [apiEndpoint]);

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
      
      // Draw grid lines on the Earth (simplified)
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
      
      // Draw satellites and debris
      satellites.forEach((sat, index) => {
        // Calculate position based on orbit type
        const orbitMultiplier = 
          sat.orbitType === 'LEO' ? 1 :
          sat.orbitType === 'MEO' ? 2 :
          sat.orbitType === 'GEO' ? 3 : 4;
        
        const orbitRadius = earthRadius + (orbitMultiplier * 35 * zoom.current);
        
        // Use coordinates from Flask API if available, otherwise calculate position
        let x, y;
        
        if (sat.x !== undefined && sat.y !== undefined) {
          // Scale the coordinates to fit the canvas
          const scale = orbitRadius / Math.sqrt(sat.x * sat.x + sat.y * sat.y + (sat.z || 0) * (sat.z || 0));
          x = centerX + sat.x * scale;
          y = centerY + sat.y * scale;
        } else {
          // Fallback to the original calculation
          const angle = (index * 0.2) + (Date.now() / (3000 + index * 100)) % (Math.PI * 2);
          x = centerX + orbitRadius * Math.cos(angle) * Math.cos(sat.inclination / 180 * Math.PI * 0.2);
          y = centerY + orbitRadius * Math.sin(angle) * Math.sin(rotation.current.y * 0.1 + sat.inclination / 180 * Math.PI * 0.2);
        }
        
        // Size based on satellite type and selection
        const size = sat.type === 'satellite' ? 4 * zoom.current : 2 * zoom.current;
        const isSelected = selectedSatellite && selectedSatellite.id === sat.id;
        
        // Draw the satellite/debris
        context.beginPath();
        context.fillStyle = sat.type === 'satellite' 
          ? (sat.riskFactor && sat.riskFactor > 60 ? '#FF710D' : '#00D2FF') 
          : '#AAAAAA';
        
        if (isSelected) {
          // Highlight selected satellite
          context.shadowColor = '#00D2FF';
          context.shadowBlur = 10;
          context.arc(x, y, size * 1.5, 0, Math.PI * 2);
        } else {
          context.shadowBlur = 0;
          context.arc(x, y, size, 0, Math.PI * 2);
        }
        
        context.fill();
        context.shadowBlur = 0;
        
        // Store the position for click detection
        sat.position = { x, y, z: 0 };
        
        // Draw label for selected satellite
        if (isSelected) {
          context.font = '12px "Space Grotesk"';
          context.fillStyle = '#FFFFFF';
          context.textAlign = 'center';
          context.fillText(sat.name, x, y - 15);
          
          // Draw connecting line
          context.beginPath();
          context.strokeStyle = '#00D2FF';
          context.moveTo(x, y);
          context.lineTo(x, y - 10);
          context.stroke();
        }
        
        // Check if mouse is hovering over this satellite
        if (lastMousePos.current) {
          const dx = x - lastMousePos.current.x;
          const dy = y - lastMousePos.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 10 * zoom.current) {
            setHoveredSatellite(sat);
            setMousePosition({ x, y });
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
        if (!sat.position) continue;
        
        const distance = Math.sqrt(
          Math.pow(sat.position.x - x, 2) + 
          Math.pow(sat.position.y - y, 2)
        );
        
        if (distance < 10) { // Click tolerance
          onSelectSatellite(sat);
          return;
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
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-space-darker bg-opacity-70 z-20">
          <div className="space-y-2 text-center">
            <div className="h-6 w-6 border-2 border-space-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-space-accent text-sm">Loading satellite data...</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-space-darker bg-opacity-70 z-20">
          <div className="bg-red-900 bg-opacity-80 p-4 rounded-md max-w-md">
            <h3 className="text-red-200 font-bold">Data Fetch Error</h3>
            <p className="text-red-100">{error}</p>
            <p className="text-xs text-red-300 mt-2">Check your Flask API endpoint and ensure CORS is properly configured.</p>
          </div>
        </div>
      )}
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
          {hoveredSatellite.z !== undefined && (
            <div>Position: ({hoveredSatellite.x.toFixed(0)}, {hoveredSatellite.y.toFixed(0)}, {hoveredSatellite.z.toFixed(0)})</div>
          )}
          <div>Inclination: {hoveredSatellite.inclination.toFixed(2)}°</div>
          {hoveredSatellite.riskFactor !== null && (
            <div className={hoveredSatellite.riskFactor > 60 ? 'text-red-400' : 'text-green-400'}>
              Risk: {Math.round(hoveredSatellite.riskFactor)}%
            </div>
          )}
        </div>
      )}
      <div className="absolute bottom-4 left-4 bg-space-overlay px-2 py-1 rounded text-xs text-gray-300">
        Drag to rotate | Scroll to zoom | {satellites.length} objects
      </div>
      <div className="absolute top-4 right-4 bg-space-accent bg-opacity-25 px-2 py-1 rounded-full text-xs text-white">
        Flask API
      </div>
    </div>
  );
};

export default DebrisSimulation2;
