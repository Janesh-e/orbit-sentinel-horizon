
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { FastForward, Play, Pause, Clock, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PredictionControlsProps {
  className?: string;
  onTimeChange: (hour: number) => void;
}

const PredictionControls: React.FC<PredictionControlsProps> = ({
  className,
  onTimeChange
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [timeAhead, setTimeAhead] = useState(0);
  const maxHours = 168; // 7 days

  // Format hours as days + hours
  const formatTime = (hours: number) => {
    if (hours === 0) return 'Current time';
    const days = Math.floor(hours / 24);
    const remainingHours = Math.floor(hours % 24);
    
    if (days === 0) {
      return `+${remainingHours}h`;
    } else {
      return `+${days}d ${remainingHours}h`;
    }
  };

  // Toggle play/pause
  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  // Reset time to current
  const resetTime = () => {
    setTimeAhead(0);
    setIsPlaying(false);
    onTimeChange(0);
  };

  // Update speed
  const changeSpeed = (speed: number) => {
    setSimulationSpeed(speed);
  };

  // Handle slider change
  const handleTimeSliderChange = (value: number[]) => {
    setTimeAhead(value[0]);
    onTimeChange(value[0]);
  };

  return (
    <div className={cn("p-4 space-card", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Clock className="h-5 w-5 text-space-accent mr-2" />
          <h3 className="text-lg font-semibold text-white">Time Prediction</h3>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "text-gray-300 hover:text-space-accent",
              isPlaying && "text-space-accent"
            )}
            onClick={togglePlayback}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-gray-300 hover:text-space-accent"
            onClick={resetTime}
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Simulation time</span>
          <span className="text-sm text-space-accent font-mono">{formatTime(timeAhead)}</span>
        </div>
        <Slider 
          defaultValue={[0]} 
          max={maxHours} 
          step={1}
          value={[timeAhead]}
          onValueChange={handleTimeSliderChange}
          className="py-1"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Now</span>
          <span>+7 days</span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Playback speed</span>
        </div>
        
        <div className="flex space-x-2">
          {[1, 5, 10, 24].map((speed) => (
            <Button
              key={speed}
              variant="outline"
              size="sm"
              className={cn(
                "flex-1 text-sm bg-space-darker border-space-grid",
                simulationSpeed === speed ? "border-space-accent text-space-accent" : "text-gray-300"
              )}
              onClick={() => changeSpeed(speed)}
            >
              {speed === 1 ? (
                <>1x</>
              ) : (
                <>{speed}x</>
              )}
            </Button>
          ))}
        </div>
        
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Jump to time</span>
          </div>
          
          <div className="flex space-x-2">
            <Input 
              type="number" 
              min="0" 
              max={maxHours}
              value={timeAhead} 
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 0 && value <= maxHours) {
                  setTimeAhead(value);
                  onTimeChange(value);
                }
              }}
              className="bg-space-darker border-space-grid text-white"
            />
            <Button className="bg-space-blue hover:bg-space-blue/80">
              <FastForward className="h-4 w-4 mr-1" />
              Go
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionControls;
