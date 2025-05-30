import React, { useState, useEffect } from 'react';
import { Calendar, AlertTriangle, Clock, Zap, Target, Info, Satellite, Trash2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import axios from 'axios';

interface ConjunctionDetection {
  id: number;
  object1_id: number;
  object1_name: string;
  object1_type: string;
  object2_id: number;
  object2_name: string;
  object2_type: string;
  detected_at: string;
  conjunction_time: string;
  closest_distance_km: number;
  object1_velocity_km_s: number;
  object2_velocity_km_s: number;
  relative_velocity_km_s: number;
  probability: number;
  orbit_zone: string;
}

interface ManeuverData {
  conjunction_id: number;
  object_id: number;
  maneuver_type: string;
  delta_v_m_s: number;
  execution_time: string;
  expected_miss_distance_km: number;
  fuel_cost_kg: number;
  risk_reduction_percent: number;
}

const DailyConjunctions = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [conjunctions, setConjunctions] = useState<ConjunctionDetection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maneuverData, setManeuverData] = useState<{ [key: number]: ManeuverData | null }>({});
  const [loadingManeuver, setLoadingManeuver] = useState<{ [key: number]: boolean }>({});

  const fetchConjunctions = async (date: Date) => {
    setLoading(true);
    setError(null);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const response = await axios.get(`http://localhost:5000/api/daily_conjunctions?date=${dateStr}`);
      setConjunctions(response.data);
      console.log('Fetched conjunctions for', dateStr, ':', response.data.length, 'detections');
    } catch (err) {
      console.error('Error fetching conjunctions:', err);
      setError('Failed to fetch conjunction data');
      setConjunctions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConjunctions(selectedDate);
  }, [selectedDate]);

  const getRiskLevel = (probability: number) => {
    if (probability > 0.7) return { level: 'high', color: 'bg-red-500', textColor: 'text-red-100' };
    if (probability > 0.4) return { level: 'medium', color: 'bg-orange-500', textColor: 'text-orange-100' };
    return { level: 'low', color: 'bg-green-500', textColor: 'text-green-100' };
  };

  const getObjectIcon = (type: string) => {
    return type === 'satellite' ? Satellite : Trash2;
  };

  const formatDateTime = (timeStr: string) => {
    try {
      return format(new Date(timeStr), 'MMM dd, yyyy HH:mm:ss');
    } catch {
      return timeStr;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy');
    } catch {
      return dateStr;
    }
  };

  const fetchManeuverData = async (conjunctionId: number) => {
    if (maneuverData[conjunctionId] !== undefined) {
      return; // Already fetched or attempted
    }

    setLoadingManeuver(prev => ({ ...prev, [conjunctionId]: true }));
    
    try {
      const response = await axios.get(`http://localhost:5000/api/maneuver/${conjunctionId}`);
      setManeuverData(prev => ({ ...prev, [conjunctionId]: response.data }));
      console.log('Fetched maneuver data for conjunction', conjunctionId, ':', response.data);
    } catch (err) {
      console.error('Error fetching maneuver data:', err);
      setManeuverData(prev => ({ ...prev, [conjunctionId]: null }));
    } finally {
      setLoadingManeuver(prev => ({ ...prev, [conjunctionId]: false }));
    }
  };

  return (
    <div className="space-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-space-accent" />
          <h2 className="text-lg font-semibold text-white">Daily Conjunction Detections</h2>
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[200px] justify-start text-left font-normal bg-space-dark border-space-grid text-white hover:bg-space-light",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-space-dark border-space-grid" align="start">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
              className="p-3 pointer-events-auto bg-space-dark text-white"
              disabled={(date) => date > new Date()}
            />
          </PopoverContent>
        </Popover>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-space-accent"></div>
          <span className="ml-2 text-gray-400">Loading conjunctions...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && conjunctions.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No conjunctions detected for {format(selectedDate, 'MMM dd, yyyy')}</p>
        </div>
      )}

      {!loading && !error && conjunctions.length > 0 && (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {conjunctions.map((conjunction) => {
            const risk = getRiskLevel(conjunction.probability);
            const Object1Icon = getObjectIcon(conjunction.object1_type);
            const Object2Icon = getObjectIcon(conjunction.object2_type);
            const currentManeuverData = maneuverData[conjunction.id];
            const isLoadingManeuver = loadingManeuver[conjunction.id];
            
            return (
              <Card key={conjunction.id} className="bg-space-dark border-space-grid hover:border-space-accent/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-white flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        <Object1Icon className="h-3 w-3 text-space-accent" />
                        <span className="text-space-accent">{conjunction.object1_name}</span>
                      </div>
                      <Zap className="h-3 w-3 text-orange-400" />
                      <div className="flex items-center space-x-1">
                        <Object2Icon className="h-3 w-3 text-space-accent" />
                        <span className="text-space-accent">{conjunction.object2_name}</span>
                      </div>
                    </CardTitle>
                    <Badge className={`${risk.color} ${risk.textColor} text-xs`}>
                      {(conjunction.probability * 100).toFixed(1)}% risk
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-300 mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1">
                        <Target className="h-3 w-3" />
                        <span>Distance: {conjunction.closest_distance_km.toFixed(2)} km</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Zap className="h-3 w-3" />
                        <span>Rel. Velocity: {conjunction.relative_velocity_km_s.toFixed(2)} km/s</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Object1Icon className="h-3 w-3" />
                        <span>{conjunction.object1_name}: {conjunction.object1_velocity_km_s.toFixed(2)} km/s</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Object2Icon className="h-3 w-3" />
                        <span>{conjunction.object2_name}: {conjunction.object2_velocity_km_s.toFixed(2)} km/s</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>Conjunction: {formatDateTime(conjunction.conjunction_time)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-gray-400">Zone: {conjunction.orbit_zone}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      Detected: {formatDateTime(conjunction.detected_at)}
                    </div>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="bg-space-light border-space-grid text-white hover:bg-space-accent hover:text-space-dark"
                          onClick={() => fetchManeuverData(conjunction.id)}
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          Mitigation Plan
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-space-dark border-space-grid text-white max-w-lg">
                        <DialogHeader>
                          <DialogTitle className="text-space-accent flex items-center space-x-2">
                            <Shield className="h-4 w-4" />
                            <span>Collision Avoidance Maneuver</span>
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 text-sm">
                          <div className="bg-space-light p-3 rounded-lg">
                            <h4 className="font-medium mb-2">Conjunction Details:</h4>
                            <div className="text-gray-300 space-y-1">
                              <p className="flex items-center space-x-1">
                                <Object1Icon className="h-3 w-3" />
                                <span>{conjunction.object1_name} ({conjunction.object1_type})</span>
                              </p>
                              <p className="flex items-center space-x-1">
                                <Object2Icon className="h-3 w-3" />
                                <span>{conjunction.object2_name} ({conjunction.object2_type})</span>
                              </p>
                              <p className="mt-1">
                                Risk Level: <span className={risk.textColor}>{risk.level.toUpperCase()}</span>
                              </p>
                            </div>
                          </div>
                          
                          {isLoadingManeuver && (
                            <div className="flex items-center justify-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-space-accent"></div>
                              <span className="ml-2 text-gray-400">Loading maneuver plan...</span>
                            </div>
                          )}
                          
                          {currentManeuverData && (
                            <div className="space-y-3">
                              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                                <h4 className="font-medium mb-2 text-green-400 flex items-center space-x-1">
                                  <Target className="h-3 w-3" />
                                  <span>Recommended Maneuver</span>
                                </h4>
                                <div className="text-gray-300 space-y-2 text-xs">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <span className="text-gray-400">Type:</span>
                                      <p className="font-medium capitalize">{currentManeuverData.maneuver_type}</p>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">Delta-V:</span>
                                      <p className="font-medium">{currentManeuverData.delta_v_m_s.toFixed(3)} m/s</p>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">Fuel Cost:</span>
                                      <p className="font-medium">{currentManeuverData.fuel_cost_kg.toFixed(2)} kg</p>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">Risk Reduction:</span>
                                      <p className="font-medium text-green-400">{currentManeuverData.risk_reduction_percent.toFixed(1)}%</p>
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Execution Time:</span>
                                    <p className="font-medium">{formatDateTime(currentManeuverData.execution_time)}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Expected Miss Distance:</span>
                                    <p className="font-medium">{currentManeuverData.expected_miss_distance_km.toFixed(2)} km</p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                                <h4 className="font-medium mb-2 text-blue-400">Mission Impact Assessment</h4>
                                <ul className="text-gray-300 space-y-1 text-xs">
                                  <li>• Minimal impact on mission objectives</li>
                                  <li>• Fuel consumption within acceptable limits</li>
                                  <li>• Maneuver window allows for precise execution</li>
                                  <li>• Post-maneuver trajectory analysis recommended</li>
                                </ul>
                              </div>
                            </div>
                          )}
                          
                          {currentManeuverData === null && !isLoadingManeuver && (
                            <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-3">
                              <h4 className="font-medium mb-2 text-orange-400">No Maneuver Plan Available</h4>
                              <p className="text-gray-300 text-xs">
                                No specific maneuver plan has been generated for this conjunction. 
                                Standard monitoring protocols are in effect.
                              </p>
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-500">
                            Maneuver plans are generated automatically based on conjunction analysis and orbital mechanics calculations.
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      
      {conjunctions.length > 0 && (
        <div className="mt-4 text-xs text-gray-500 text-center">
          Showing {conjunctions.length} conjunction{conjunctions.length !== 1 ? 's' : ''} for {format(selectedDate, 'MMM dd, yyyy')}
        </div>
      )}
    </div>
  );
};

export default DailyConjunctions;
