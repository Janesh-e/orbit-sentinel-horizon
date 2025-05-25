
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
  const panOffset = useRef({ x: 0, y: 0 });
  const [hoveredSatellite, setHoveredSatellite] = useState<SatellitePosition | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showGridlines, setShowGridlines] = useState(true);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Use custom hooks for data management
  const { orbitalElements, error } = useSatelliteData(apiEndpoint, propSatellites);
  const satellites = useSatellitePositions(orbitalElements);

  // Generate heatmap data based on object density and risk
  const generateHeatmapData = () => {
    const heatmapPoints: Array<{ x: number; y: number; intensity: number }> = [];
    const gridSize = 50;
    const canvasWidth = canvasRef.current?.width || 800;
    const canvasHeight = canvasRef.current?.height || 600;
    
    for (let x = 0; x < canvasWidth; x += gridSize) {
      for (let y = 0; y < canvasHeight; y += gridSize) {
        let intensity = 0;
        let objectCount = 0;
        
        // Check objects within this grid cell
        satellites.forEach(obj => {
          const scale = 0.02 * zoom.current;
          const x3d = obj.x * scale;
          const y3d = obj.y * scale;
          const z3d = obj.z * scale;
          
          const cosRotX = Math.cos(rotation.current.x * 0.01);
          const sinRotX = Math.sin(rotation.current.x * 0.01);
          const cosRotY = Math.cos(rotation.current.y * 0.01);
          const sinRotY = Math.sin(rotation.current.y * 0.01);
          
          const x2d = x3d * cosRotY - z3d * sinRotY;
          const y2d = y3d * cosRotX - (x3d * sinRotY + z3d * cosRotY) * sinRotX;
          
          const screenX = (canvasWidth / 2) + x2d + panOffset.current.x;
          const screenY = (canvasHeight / 2) + y2d + panOffset.current.y;
          
          // Check if object is within grid cell
          if (screenX >= x && screenX < x + gridSize && screenY >= y && screenY < y + gridSize) {
            intensity += obj.riskFactor;
            objectCount++;
          }
        });
        
        if (objectCount > 0) {
          heatmapPoints.push({
            x: x + gridSize / 2,
            y: y + gridSize / 2,
            intensity: (intensity / objectCount) * (objectCount / 10) // Factor in density
          });
        }
      }
    }
    
    return heatmapPoints;
  };

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

      const centerX = canvas.width / 2 + panOffset.current.x;
      const centerY = canvas.height / 2 + panOffset.current.y;
      const earthRadius = 40 * zoom.current;

      // Draw heatmap if enabled
      if (showHeatmap) {
        const heatmapData = generateHeatmapData();
        heatmapData.forEach(point => {
          const intensity = Math.min(point.intensity / 100, 1);
          const radius = 30 * zoom.current;
          
          const gradient = context.createRadialGradient(
            point.x, point.y, 0,
            point.x, point.y, radius
          );
          
          if (intensity > 0.7) {
            gradient.addColorStop(0, `rgba(255, 0, 0, ${intensity * 0.6})`);
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
          } else if (intensity > 0.4) {
            gradient.addColorStop(0, `rgba(255, 165, 0, ${intensity * 0.5})`);
            gradient.addColorStop(1, 'rgba(255, 165, 0, 0)');
          } else {
            gradient.addColorStop(0, `rgba(255, 255, 0, ${intensity * 0.4})`);
            gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
          }
          
          context.fillStyle = gradient;
          context.beginPath();
          context.arc(point.x, point.y, radius, 0, Math.PI * 2);
          context.fill();
        });
      }

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
      
      const objectsToDraw = filteredSatelliteId 
        ? satellites.filter(sat => sat.id === filteredSatelliteId)
        : satellites;
      
      // Draw space objects (satellites and debris)
      objectsToDraw.forEach((obj) => {
        const scale = 0.02 * zoom.current;
        const x3d = obj.x * scale;
        const y3d = obj.y * scale;
        const z3d = obj.z * scale;
        
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
        
        const isSelected = selectedSatellite && selectedSatellite.id === obj.id;
        const isHighlighted = highlightedSatellite === obj.id;
        const isFiltered = filteredSatelliteId === obj.id;
        
        // Different sizes for satellites vs debris
        let baseSize = obj.type === 'debris' ? 3 : 6; // Debris is smaller
        let size = (obj.orbitType === 'LEO' ? baseSize : baseSize * 0.7) * zoom.current;
        
        if (isHighlighted || isFiltered) {
          size *= 1.5;
        }
        
        // Draw trail for highlighted objects
        if (isHighlighted || isFiltered) {
          context.strokeStyle = obj.type === 'debris' ? 'rgba(156, 163, 175, 0.5)' : 'rgba(59, 130, 246, 0.5)';
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
        
        // Draw object with different colors for satellites vs debris
        context.beginPath();
        
        if (isHighlighted || isFiltered) {
          context.fillStyle = obj.type === 'debris' ? '#9ca3af' : '#3b82f6'; // Grey for debris, blue for satellites
        } else if (obj.type === 'debris') {
          context.fillStyle = '#6b7280'; // Grey for debris
        } else if (obj.riskFactor > 60) {
          context.fillStyle = '#ef4444'; // Red for high-risk satellites
        } else {
          context.fillStyle = '#10b981'; // Green for normal satellites
        }
        
        if (isSelected) {
          context.shadowColor = obj.type === 'debris' ? '#9ca3af' : '#3b82f6';
          context.shadowBlur = 15;
          context.arc(screenX, screenY, size * 1.2, 0, Math.PI * 2);
        } else {
          context.shadowBlur = 0;
          context.arc(screenX, screenY, size, 0, Math.PI * 2);
        }
        
        context.fill();
        context.shadowBlur = 0;
        
        (obj as any).screenPosition = { x: screenX, y: screenY, size };
        
        if (isSelected || isHighlighted || isFiltered) {
          context.font = '12px Arial';
          context.fillStyle = '#ffffff';
          context.textAlign = 'center';
          context.fillText(obj.name, screenX, screenY - 25);
          
          if (isHighlighted || isFiltered) {
            context.font = '10px Arial';
            context.fillText(`Alt: ${Math.round(obj.altitude)}km`, screenX, screenY - 10);
            context.fillText(`${obj.type.toUpperCase()}: ${obj.id}`, screenX, screenY + 25);
          }
        }
        
        if (lastMousePos.current) {
          const dx = screenX - lastMousePos.current.x;
          const dy = screenY - lastMousePos.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < size + 5) {
            setHoveredSatellite(obj);
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
      
      const objectsToCheck = filteredSatelliteId 
        ? satellites.filter(sat => sat.id === filteredSatelliteId)
        : satellites;
      
      for (const obj of objectsToCheck) {
        const screenPos = (obj as any).screenPosition;
        if (screenPos) {
          const distance = Math.sqrt(
            Math.pow(screenPos.x - x, 2) + 
            Math.pow(screenPos.y - y, 2)
          );
          
          if (distance < screenPos.size + 5) {
            console.log('Clicked on space object in simulation:', obj.id, obj.name, obj.type);
            onSelectSatellite(obj);
            return;
          }
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      const rect = canvas.getBoundingClientRect();
      lastMousePos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const currentPos = { 
        x: e.clientX - rect.left, 
        y: e.clientY - rect.top 
      };
      
      if (isDragging.current) {
        const deltaX = currentPos.x - lastMousePos.current.x;
        const deltaY = currentPos.y - lastMousePos.current.y;
        
        rotation.current.x += deltaY * 0.005;
        rotation.current.y += deltaX * 0.005;
      }
      
      lastMousePos.current = currentPos;
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const oldZoom = zoom.current;
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      zoom.current *= zoomFactor;
      zoom.current = Math.max(0.05, Math.min(zoom.current, 15.0));
      
      // Calculate zoom-to-cursor
      const zoomChange = zoom.current / oldZoom;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      panOffset.current.x = mouseX - (mouseX - panOffset.current.x) * zoomChange;
      panOffset.current.y = mouseY - (mouseY - panOffset.current.y) * zoomChange;
      
      panOffset.current.x -= centerX;
      panOffset.current.y -= centerY;
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
  }, [satellites, selectedSatellite, onSelectSatellite, highlightedSatellite, filteredSatelliteId, showGridlines, showHeatmap]);

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
        showInstructions={showInstructions}
        onToggleInstructions={() => setShowInstructions(!showInstructions)}
        showHeatmap={showHeatmap}
        onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
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
