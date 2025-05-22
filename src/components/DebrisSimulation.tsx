
import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { SatelliteData } from '@/utils/satelliteData';

interface DebrisSimulationProps {
  satellites: SatelliteData[];
  selectedSatellite: SatelliteData | null;
  className?: string;
  onSelectSatellite: (satellite: SatelliteData) => void;
}

const DebrisSimulation: React.FC<DebrisSimulationProps> = ({
  satellites,
  selectedSatellite,
  className,
  onSelectSatellite
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const rotation = useRef({ x: 0, y: 0 });
  const zoom = useRef(1);

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
          orbitRadius * Math.cos(rotation.ref * 0.1), 
          rotation.x * 0.1, 
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
        earthRadius * Math.cos(rotation.y * 0.1),
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
        Math.PI/2 + rotation.x * 0.1,
        0,
        Math.PI * 2
      );
      context.stroke();
      
      // Draw satellites and debris
      satellites.forEach((sat, index) => {
        // Calculate position based on orbit type
        const orbitMultiplier = 
          sat.orbitType === 'LEO' ? 1 :
          sat.orbitType === 'MEO' ? 2 :
          sat.orbitType === 'GEO' ? 3 : 4;
        
        const orbitRadius = earthRadius + (orbitMultiplier * 35 * zoom.current);
        const angle = (index * 0.2) + (Date.now() / (3000 + index * 100)) % (Math.PI * 2);
        
        // Calculate position with inclination
        const x = centerX + orbitRadius * Math.cos(angle) * Math.cos(sat.inclination / 180 * Math.PI * 0.2);
        const y = centerY + orbitRadius * Math.sin(angle) * Math.sin(rotation.y * 0.1 + sat.inclination / 180 * Math.PI * 0.2);
        
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

    // Handle mouse move for rotation
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      
      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;
      
      rotation.current.x += deltaX * 0.005;
      rotation.current.y += deltaY * 0.005;
      
      lastMousePos.current = { x: e.clientX, y: e.clientY };
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
      <div className="absolute bottom-4 left-4 bg-space-overlay px-2 py-1 rounded text-xs text-gray-300">
        Drag to rotate | Scroll to zoom
      </div>
    </div>
  );
};

export default DebrisSimulation;
