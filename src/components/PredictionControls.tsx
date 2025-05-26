
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { FastForward, Play, Pause, Clock, RotateCcw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import axios from 'axios';

interface SatelliteData {
  id: string;
  name: string;
  type: string;
  orbitType: string;
  altitude: number;
  inclination: number;
  riskFactor: number;
}

interface ConjunctionPrediction {
  id: string;
  primaryObject: string;
  secondaryObject: string;
  timeToConjunction: number; // hours from now
  minimumDistance: number; // km
  probability: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface BackendConjunctionResult {
  withId: string;
  withName: string;
  withType: string;
  closestDistance_km: number;
  relativeVelocity_km_s: number;
  probability: number;
  time: string;
}

interface BackendResponse {
  objectId: string;
  objectType: string;
  conjunctions: BackendConjunctionResult[];
}

interface PredictionControlsProps {
  className?: string;
  selectedSatellite: SatelliteData | null;
  onTimeChange: (hour: number) => void;
  onConjunctionAlert?: (predictions: ConjunctionPrediction[]) => void;
  dangerThreshold?: number;
}

const PredictionControls: React.FC<PredictionControlsProps> = ({
  className,
  selectedSatellite,
  onTimeChange,
  onConjunctionAlert,
  dangerThreshold = 5.0
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [timeAhead, setTimeAhead] = useState(0);
  const [conjunctionPredictions, setConjunctionPredictions] = useState<ConjunctionPrediction[]>([]);
  const [backendConjunctions, setBackendConjunctions] = useState<BackendConjunctionResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const maxHours = 168; // 7 days

  // Clear predictions when satellite changes
  useEffect(() => {
    setConjunctionPredictions([]);
    setBackendConjunctions([]);
    setAnalysisError(null);
    setTimeAhead(0);
    setIsPlaying(false);
    onTimeChange(0);
  }, [selectedSatellite?.id, onTimeChange]);

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying || !selectedSatellite) return;

    const interval = setInterval(() => {
      setTimeAhead(prev => {
        const newTime = Math.min(prev + simulationSpeed, maxHours);
        onTimeChange(newTime);
        
        if (newTime >= maxHours) {
          setIsPlaying(false);
        }
        
        return newTime;
      });
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [isPlaying, simulationSpeed, selectedSatellite, onTimeChange]);

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

  // Convert backend conjunction results to display format
  const convertBackendResults = (backendResults: BackendConjunctionResult[]): ConjunctionPrediction[] => {
    return backendResults.map((result, index) => ({
      id: `backend-${Date.now()}-${index}`,
      primaryObject: selectedSatellite?.name || 'Selected Object',
      secondaryObject: result.withName,
      timeToConjunction: 0, // Will be calculated from result.time if needed
      minimumDistance: result.closestDistance_km,
      probability: result.probability,
      riskLevel: result.closestDistance_km < 2 ? 'high' : result.closestDistance_km < 5 ? 'medium' : 'low'
    }));
  };

  // Analyze conjunctions for selected satellite using backend API
  const analyzeConjunctions = async () => {
    if (!selectedSatellite) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setBackendConjunctions([]);

    try {
      console.log('Analyzing conjunctions for:', selectedSatellite.id, selectedSatellite.name);
      
      const requestPayload = {
        id: selectedSatellite.id,
        type: selectedSatellite.type,
        days: Math.ceil(maxHours / 24), // Convert hours to days
        threshold_km: dangerThreshold
      };

      console.log('Sending request to backend:', requestPayload);

      const response = await axios.post<BackendResponse>('http://localhost:5000/api/simulate-conjunction', requestPayload);
      
      console.log('Backend response:', response.data);

      const { conjunctions } = response.data;
      setBackendConjunctions(conjunctions);
      
      // Convert to legacy format for alerts
      const convertedPredictions = convertBackendResults(conjunctions);
      setConjunctionPredictions(convertedPredictions);
      onConjunctionAlert?.(convertedPredictions);
      
    } catch (error) {
      console.error('Error analyzing conjunctions:', error);
      if (axios.isAxiosError(error)) {
        setAnalysisError(`Backend error: ${error.response?.data?.error || error.message}`);
      } else {
        setAnalysisError('Failed to analyze conjunctions');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Toggle play/pause
  const togglePlayback = () => {
    if (!selectedSatellite) return;
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

  // Get risk level color
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
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
              isPlaying && "text-space-accent",
              !selectedSatellite && "opacity-50 cursor-not-allowed"
            )}
            onClick={togglePlayback}
            disabled={!selectedSatellite}
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

      {/* Selected Object Info */}
      {selectedSatellite ? (
        <div className="mb-4 p-3 bg-space-darker rounded border border-space-grid">
          <div className="text-sm font-medium text-white">{selectedSatellite.name}</div>
          <div className="text-xs text-gray-400">
            {selectedSatellite.type.toUpperCase()} • {selectedSatellite.orbitType} • 
            Alt: {Math.round(selectedSatellite.altitude)}km
          </div>
        </div>
      ) : (
        <div className="mb-4 p-3 bg-space-darker rounded border border-space-grid border-dashed">
          <div className="text-sm text-gray-400 text-center">
            Select a space object to enable time prediction
          </div>
        </div>
      )}

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
          disabled={!selectedSatellite}
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Now</span>
          <span>+7 days</span>
        </div>
      </div>

      <div className="mb-4">
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
                simulationSpeed === speed ? "border-space-accent text-space-accent" : "text-gray-300",
                !selectedSatellite && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => changeSpeed(speed)}
              disabled={!selectedSatellite}
            >
              {speed === 1 ? '1x' : `${speed}x`}
            </Button>
          ))}
        </div>
      </div>

      {/* Conjunction Analysis */}
      <div className="border-t border-space-grid pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-white">Conjunction Analysis</span>
          <Button
            size="sm"
            onClick={analyzeConjunctions}
            disabled={!selectedSatellite || isAnalyzing}
            className="bg-space-blue hover:bg-space-blue/80 text-xs"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </Button>
        </div>

        {analysisError && (
          <div className="text-xs text-red-400 mb-2">{analysisError}</div>
        )}

        {backendConjunctions.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-gray-400 mb-2">
              {backendConjunctions.length} conjunction(s) found from backend
            </div>
            {backendConjunctions.slice(0, 5).map((conjunction, index) => (
              <div 
                key={`${conjunction.withId}-${index}`}
                className="p-2 bg-space-darker rounded border border-space-grid text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-medium">
                    vs {conjunction.withName}
                  </span>
                  <div className="flex items-center">
                    <AlertTriangle className={cn("h-3 w-3 mr-1", 
                      conjunction.closestDistance_km < 2 ? 'text-red-400' :
                      conjunction.closestDistance_km < 5 ? 'text-yellow-400' : 'text-green-400'
                    )} />
                    <span className={cn("text-xs",
                      conjunction.closestDistance_km < 2 ? 'text-red-400' :
                      conjunction.closestDistance_km < 5 ? 'text-yellow-400' : 'text-green-400'
                    )}>
                      {conjunction.closestDistance_km < 2 ? 'HIGH' :
                       conjunction.closestDistance_km < 5 ? 'MEDIUM' : 'LOW'}
                    </span>
                  </div>
                </div>
                <div className="text-gray-400 space-y-1">
                  <div>Distance: {conjunction.closestDistance_km.toFixed(2)}km</div>
                  <div>Velocity: {conjunction.relativeVelocity_km_s.toFixed(2)}km/s</div>
                  <div>Probability: {(conjunction.probability * 100).toFixed(2)}%</div>
                  <div>Type: {conjunction.withType.toUpperCase()}</div>
                  <div>Time: {conjunction.time}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {backendConjunctions.length === 0 && selectedSatellite && !isAnalyzing && (
          <div className="text-xs text-gray-400 text-center py-2">
            No conjunction analysis performed yet
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionControls;
