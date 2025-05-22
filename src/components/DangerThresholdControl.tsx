
import React from 'react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface DangerThresholdControlProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

const DangerThresholdControl: React.FC<DangerThresholdControlProps> = ({
  value,
  onChange,
  className
}) => {
  const handleSliderChange = (newValue: number[]) => {
    onChange(newValue[0]);
  };

  // Calculate colors for the distance indicator
  const getSeverityColor = (threshold: number): string => {
    if (threshold < 2) return 'bg-red-500';
    if (threshold < 5) return 'bg-orange-500';
    if (threshold < 10) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className={cn("space-card p-4", className)}>
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-space-accent">Collision Risk Threshold</h3>
          <div className="flex items-center space-x-2">
            <div className={cn("w-3 h-3 rounded-full", getSeverityColor(value))}></div>
            <span className="text-sm font-mono">{value.toFixed(1)} km</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Set the minimum distance between objects to trigger an alert
        </p>
      </div>
      
      <div className="relative pt-1">
        <Slider 
          value={[value]} 
          min={0.1} 
          max={20} 
          step={0.1}
          onValueChange={handleSliderChange}
        />
        
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>0.1 km (High Risk)</span>
          <span>20 km (Low Risk)</span>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-space-grid">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
            <span>&lt; 2 km: Critical</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-orange-500 mr-2"></div>
            <span>&lt; 5 km: High</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
            <span>&lt; 10 km: Medium</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
            <span>&gt; 10 km: Low</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DangerThresholdControl;
