
import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useSatelliteData } from '@/hooks/useSatelliteData';
import { useSatellitePositions } from '@/hooks/useSatellitePositions';
import ControlsOverlay from '@/components/simulation/ControlsOverlay';
import StatusOverlay from '@/components/simulation/StatusOverlay';
import SatelliteTooltip from '@/components/simulation/SatelliteTooltip';

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
  satellites?: any[];
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
  const [showGridlines, setShowGridlines] = useState(true);

  // Use custom hooks for data management
  const { orbitalElements, error } = useSatelliteData(apiEndpoint, propSatellites);
  const satellites = useSatellitePositions(orbitalElements);

  // Canvas drawing and interaction logic
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    const updateCanvasSize = () => {
      if (containerRef.current) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

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
        
        for (let x = 0; x <= canvas.width; x += 50 * zoom.current) {
          context.beginPath();
          context.moveTo(x, 0);
          context.lineTo(x, canvas.height);
          context.stroke();
        }
        
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

      setHoveredSatellite(null);
      
      const satellitesToDraw = filteredSatelliteId 
        ? satellites.filter(sat => sat.id === filteredSatelliteId)
        : satellites;
      
      // Draw satellites
      satellitesToDraw.forEach((sat) => {
        const scale = 0.02 * zoom.current;
        const x3d = sat.x * scale;
        const y3d = sat.y * scale;
        const z3d = sat.z * scale;
        
        const cosRotX = Math.cos(rotation.current.x * 0.01);
        const sinRotX = Math.sin(rotation.current.x * 0.01);
        const cosRotY = Math.cos(rotation.current.y * 0.01);
        const sinRotY = Math.sin(rotation.current.y * 0.01);
        
        const x2d = x3d * cosRotY - z3d * sinRotY;
        const y2d = y3d * cosRotX - (x3d * sinRotY + z3d * cosRotY) * sinRotX;
        
        const screenX = centerX + x2d;
        const screenY = centerY + y2d;
        
        const z2d = x3d * sinRotY + z3d * cosRotY;
        if (z2d < -1000) return;
        
        const isSelected = selectedSatellite && selectedSatellite.id === sat.id;
        const isHighlighted = highlightedSatellite === sat.id;
        const isFiltered = filteredSatelliteId === sat.id;
        
        let size = sat.orbitType === 'LEO' ? 6 * zoom.current : 4 * zoom.current;
        
        if (isHighlighted || isFiltered) {
          size *= 1.5;
        }
        
        // Draw satellite trail for highlighted satellites
        if (isHighlighted || isFiltered) {
          context.strokeStyle = 'rgba(59, 130, 246, 0.5)';
          context.lineWidth = 2;
          context.beginPath();
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
          context.fillStyle = '#3b82f6';
        } else if (sat.riskFactor > 60) {
          context.fillStyle = '#ef4444';
        } else {
          context.fillStyle = '#10b981';
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
        
        (sat as any).screenPosition = { x: screenX, y: screenY, size };
        
        if (isSelected || isHighlighted || isFiltered) {
          context.font = '12px Arial';
          context.fillStyle = '#ffffff';
          context.textAlign = 'center';
          context.fillText(sat.name, screenX, screenY - 25);
          
          if (isHighlighted || isFiltered) {
            context.font = '10px Arial';
            context.fillText(`Alt: ${Math.round(sat.altitude)}km`, screenX, screenY - 10);
            context.fillText(`ID: ${sat.id}`, screenX, screenY + 25);
          }
        }
        
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
      zoom.current = Math.max(0.1, Math.min(zoom.current, 10.0));
    };

    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

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
        <SatelliteTooltip 
          satellite={hoveredSatellite}
          position={mousePosition}
        />
      )}
      
      <ControlsOverlay
        filteredSatelliteId={filteredSatelliteId}
        highlightedSatellite={highlightedSatellite}
        showGridlines={showGridlines}
        onToggleGridlines={() => setShowGridlines(!showGridlines)}
      />
      
      <StatusOverlay
        satellites={satellites}
        filteredSatelliteId={filteredSatelliteId}
        highlightedSatellite={highlightedSatellite}
        zoom={zoom.current}
      />
    </div>
  );
};

export default DebrisSimulation3;
