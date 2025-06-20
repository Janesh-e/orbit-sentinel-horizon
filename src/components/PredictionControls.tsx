
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Clock, AlertTriangle } from 'lucide-react';
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
  const [timeAhead, setTimeAhead] = useState(0);
  const [conjunctionPredictions, setConjunctionPredictions] = useState<ConjunctionPrediction[]>([]);
  const [backendConjunctions, setBackendConjunctions] = useState<BackendConjunctionResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisCompleted, setAnalysisCompleted] = useState(false);
  const [currentSatelliteId, setCurrentSatelliteId] = useState<string | null>(null);
  const maxHours = 168; // 7 days

  // Clear predictions when satellite changes - but preserve analysis state for same satellite
  useEffect(() => {
    if (selectedSatellite?.id !== currentSatelliteId) {
      console.log('Satellite changed from', currentSatelliteId, 'to', selectedSatellite?.id, '- clearing conjunction data');
      setConjunctionPredictions([]);
      setBackendConjunctions([]);
      setAnalysisError(null);
      setAnalysisCompleted(false);
      setTimeAhead(0);
      setCurrentSatelliteId(selectedSatellite?.id || null);
      onTimeChange(0);
    }
  }, [selectedSatellite?.id, currentSatelliteId, onTimeChange]);

  // Debug log for conjunction data
  useEffect(() => {
    console.log('Conjunction state update:', {
      backendConjunctionsCount: backendConjunctions.length,
      analysisCompleted,
      isAnalyzing,
      analysisError,
      currentSatelliteId,
      selectedSatelliteId: selectedSatellite?.id
    });
  }, [backendConjunctions, analysisCompleted, isAnalyzing, analysisError, currentSatelliteId, selectedSatellite?.id]);

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
    if (!selectedSatellite) {
      console.log('No satellite selected for analysis');
      return;
    }

    console.log('Starting conjunction analysis for:', selectedSatellite.id, selectedSatellite.name);
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisCompleted(false);

    try {
      // Convert string ID to integer for backend
      const objectId = parseInt(selectedSatellite.id.replace(/\D/g, ''), 10) || 0;
      
      const requestPayload = {
        id: objectId, // Send as integer
        type: selectedSatellite.type,
        days: Math.ceil(maxHours / 24), // Convert hours to days
        threshold_km: dangerThreshold
      };

      console.log('Sending request to backend:', requestPayload);

      const response = await axios.post<BackendResponse>('http://localhost:5000/api/simulate-conjunction', requestPayload);
      
      console.log('Backend response received:', response.data);

      const { conjunctions } = response.data;
      console.log('Processing conjunctions:', conjunctions);
      
      // Set all state at once to prevent race conditions
      setBackendConjunctions(conjunctions);
      setAnalysisCompleted(true);
      
      // Convert to legacy format for alerts
      const convertedPredictions = convertBackendResults(conjunctions);
      setConjunctionPredictions(convertedPredictions);
      onConjunctionAlert?.(convertedPredictions);
      
      console.log('Analysis completed successfully. Results set:', conjunctions.length, 'conjunctions');
      
    } catch (error) {
      console.error('Error analyzing conjunctions:', error);
      setAnalysisError(
        axios.isAxiosError(error) 
          ? `Backend error: ${error.response?.data?.error || error.message}`
          : 'Failed to analyze conjunctions'
      );
      setAnalysisCompleted(true); // Mark as completed even on error
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle slider change
  const handleTimeSliderChange = (value: number[]) => {
    const newTime = value[0];
    setTimeAhead(newTime);
    onTimeChange(newTime);
  };

  // Get risk level color
  const getRiskColor = (distance: number) => {
    if (distance < 2) return 'text-red-400';
    if (distance < 5) return 'text-yellow-400';
    return 'text-green-400';
  };

  // Get risk level text
  const getRiskLevel = (distance: number) => {
    if (distance < 2) return 'HIGH';
    if (distance < 5) return 'MEDIUM';
    return 'LOW';
  };

  return (
    <div className={cn("p-4 space-card", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Clock className="h-5 w-5 text-space-accent mr-2" />
          <h3 className="text-lg font-semibold text-white">Time Prediction</h3>
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
          value={[timeAhead]}
          onValueChange={handleTimeSliderChange}
          max={maxHours} 
          step={1}
          className="py-1"
          disabled={!selectedSatellite}
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Now</span>
          <span>+7 days</span>
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

        {/* Error Display */}
        {analysisError && (
          <div className="text-xs text-red-400 mb-2">{analysisError}</div>
        )}

        {/* Loading State */}
        {isAnalyzing && (
          <div className="p-3 bg-space-darker rounded border border-space-grid text-center">
            <div className="text-sm text-gray-400">Analyzing potential conjunctions...</div>
          </div>
        )}

        {/* Results Display - Fixed conditional rendering */}
        {analysisCompleted && !isAnalyzing && (
          <div className="space-y-3">
            {backendConjunctions.length === 0 ? (
              <div className="p-3 bg-space-darker rounded border border-space-grid text-center">
                <div className="text-sm text-gray-400 mb-1">No conjunctions found</div>
                <div className="text-xs text-gray-500">
                  No potential conjunctions expected for {selectedSatellite?.name} within the selected timeframe ({Math.ceil(maxHours / 24)} days) and threshold ({dangerThreshold.toFixed(1)} km)
                </div>
              </div>
            ) : (
              <>
                <div className="text-xs text-gray-400 mb-2">
                  {backendConjunctions.length} conjunction(s) found
                </div>
                <div className="max-h-[300px] overflow-y-auto pr-1 space-y-3">
                  {backendConjunctions.map((conjunction, index) => {
                    const riskLevel = getRiskLevel(conjunction.closestDistance_km);
                    const riskColor = getRiskColor(conjunction.closestDistance_km);
                    const isHighRisk = conjunction.closestDistance_km < 2;
                    
                    return (
                      <div
                        key={`${conjunction.withId}-${index}-${selectedSatellite?.id}`}
                        className="p-3 bg-space-darker border border-space-grid rounded-md"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-sm font-medium text-white flex items-center">
                              Conjunction Event
                              {isHighRisk && <AlertTriangle className="ml-1 h-3 w-3 text-red-400" />}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              With: {conjunction.withName} ({conjunction.withType.toUpperCase()})
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center">
                              <AlertTriangle className={cn("h-3 w-3 mr-1", riskColor)} />
                              <span className={cn("text-xs font-medium", riskColor)}>
                                {riskLevel}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              ID: {conjunction.withId}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          <div>
                            <p className="text-xs text-gray-400">Distance</p>
                            <p className="text-sm text-white">{conjunction.closestDistance_km.toFixed(2)} km</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Probability</p>
                            <p className={cn(
                              "text-sm",
                              conjunction.probability > 0.01 ? "text-red-400" : "text-white"
                            )}>
                              {(conjunction.probability * 100).toFixed(4)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Velocity</p>
                            <p className="text-sm text-white">{conjunction.relativeVelocity_km_s.toFixed(2)} km/s</p>
                          </div>
                        </div>
                        
                        <div className="mt-2 pt-2 border-t border-space-grid">
                          <p className="text-xs text-gray-400">Expected Time</p>
                          <p className="text-sm text-white">{conjunction.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Instruction when no analysis has been run */}
        {!analysisCompleted && !isAnalyzing && selectedSatellite && (
          <div className="text-xs text-gray-400 text-center py-2">
            Click "Analyze" to check for potential conjunctions
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionControls;
