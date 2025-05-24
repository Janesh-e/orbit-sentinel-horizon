
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import DebrisSimulation from '@/components/DebrisSimulation';
import DebrisSimulation3 from '@/components/DebrisSimulation3';
import StatisticsPanel from '@/components/StatisticsPanel';
import SatelliteList from '@/components/SatelliteList';
import SatelliteDetails from '@/components/SatelliteDetails';
import PredictionControls from '@/components/PredictionControls';
import AlertsLog, { Alert } from '@/components/AlertsLog';
import DangerThresholdControl from '@/components/DangerThresholdControl';
import { SatelliteData, ConjunctionEvent, generateInitialData, satelliteStats } from '@/utils/satelliteData';
import { Switch } from '@/components/ui/switch';

const Index = () => {
  const [showSidebar, setShowSidebar] = useState(true);
  const [satellites, setSatellites] = useState<SatelliteData[]>([]);
  const [conjunctions, setConjunctions] = useState<ConjunctionEvent[]>([]);
  const [selectedSatellite, setSelectedSatellite] = useState<SatelliteData | null>(null);
  const [simulationTime, setSimulationTime] = useState(0); // hours ahead of current time
  const [dangerThreshold, setDangerThreshold] = useState(5.0); // in kilometers
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [useFlaskData, setUseFlaskData] = useState(false); // Toggle between dummy data and Flask API

  // Initialize data
  useEffect(() => {
    const { satellites, conjunctions } = generateInitialData();
    setSatellites(satellites);
    setConjunctions(conjunctions);
    
    // Generate initial alerts from conjunctions
    const initialAlerts = generateAlertsFromConjunctions(conjunctions);
    setAlerts(initialAlerts);
  }, []);
  
  // Generate alerts from conjunctions
  const generateAlertsFromConjunctions = (conjs: ConjunctionEvent[]): Alert[] => {
    return conjs
      .filter(conj => conj.distance < dangerThreshold) // Only conjunctions below threshold
      .map(conj => {
        const alertType = getAlertTypeFromDistance(conj.distance);
        return {
          id: `alert-${conj.id}`,
          timestamp: new Date(conj.time).toISOString(),
          type: alertType,
          message: `Potential collision detected between ${conj.primaryObject} and ${conj.secondaryObject}`,
          details: `Distance: ${conj.distance.toFixed(2)}km | Probability: ${(conj.probability * 100).toFixed(2)}% | Time to closest approach: ${conj.timeToClosestApproach}`,
          objectIds: [conj.primaryObject, conj.secondaryObject]
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20); // Limit to 20 most recent alerts
  };
  
  // Get alert type based on distance
  const getAlertTypeFromDistance = (distance: number): Alert['type'] => {
    if (distance < 2) return 'danger';
    if (distance < 5) return 'warning';
    return 'info';
  };

  // Handle satellite selection
  const handleSelectSatellite = (satellite: SatelliteData) => {
    setSelectedSatellite(satellite);
    
    // Add an info alert when selecting a satellite
    const newAlert: Alert = {
      id: `select-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'info',
      message: `Selected satellite: ${satellite.name}`,
      details: `Orbit: ${satellite.orbitType} | Inclination: ${satellite.inclination.toFixed(2)}° | Altitude: ${satellite.altitude.toFixed(2)}km`
    };
    
    setAlerts(prev => [newAlert, ...prev].slice(0, 50));
  };

  // Handle selection from Flask data
  const handleSelectFlaskSatellite = (satellite: any) => {
    // Convert Flask satellite data to match SatelliteData type
    const convertedSatellite: SatelliteData = {
      id: satellite.id,
      name: satellite.name,
      type: satellite.type,
      orbitType: satellite.orbitType,
      inclination: satellite.inclination,
      altitude: satellite.altitude || 0,
      velocity: 0,
      launchDate: new Date(),
      owner: "Unknown",
      position: satellite.position || { x: 0, y: 0, z: 0 },
      riskFactor: satellite.riskFactor || 0
    };
    
    setSelectedSatellite(convertedSatellite);
    
    // Add an info alert when selecting a satellite
    const newAlert: Alert = {
      id: `select-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'info',
      message: `Selected satellite: ${satellite.name}`,
      details: `Orbit: ${satellite.orbitType} | Inclination: ${satellite.inclination.toFixed(2)}°`
    };
    
    setAlerts(prev => [newAlert, ...prev].slice(0, 50));
  };

  // Handle time change in simulation
  const handleTimeChange = (hours: number) => {
    setSimulationTime(hours);
    
    // Add a success alert when changing simulation time
    if (hours !== 0) {
      const newAlert: Alert = {
        id: `time-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'success',
        message: `Simulation time changed to +${hours}h`,
        details: 'Orbital positions updated based on predicted trajectories'
      };
      
      setAlerts(prev => [newAlert, ...prev].slice(0, 50));
    }
  };

  // Handle danger threshold change
  const handleThresholdChange = (value: number) => {
    setDangerThreshold(value);
    
    // Regenerate alerts based on new threshold
    const updatedAlerts = generateAlertsFromConjunctions(conjunctions);
    
    // Add an info alert about the threshold change
    const thresholdAlert: Alert = {
      id: `threshold-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'info',
      message: `Danger threshold updated to ${value.toFixed(1)} km`,
      details: `${updatedAlerts.filter(a => a.type === 'danger').length} critical alerts, ${updatedAlerts.filter(a => a.type === 'warning').length} warnings`
    };
    
    setAlerts([thresholdAlert, ...updatedAlerts].slice(0, 50));
  };

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  // Toggle between data sources
  const toggleDataSource = () => {
    const newValue = !useFlaskData;
    setUseFlaskData(newValue);
    
    // Add an info alert about the data source change
    const dataSourceAlert: Alert = {
      id: `data-source-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'info',
      message: `Data source switched to ${newValue ? 'Flask API' : 'Local dummy data'}`,
      details: newValue ? 'Now using real-time data from Flask backend' : 'Using pre-generated sample data'
    };
    
    setAlerts(prev => [dataSourceAlert, ...prev].slice(0, 50));
  };

  return (
    <div className="min-h-screen bg-space-darker text-white flex flex-col">
      <Navbar toggleSidebar={toggleSidebar} />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        {showSidebar && (
          <div className="w-80 border-r border-space-grid bg-space-dark overflow-y-auto flex-shrink-0">
            <div className="p-4">
              <SatelliteList
                satellites={satellites}
                selectedSatellite={selectedSatellite}
                onSelectSatellite={handleSelectSatellite}
              />
            </div>
          </div>
        )}
        
        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Data source switch */}
            <div className="lg:col-span-2 flex items-center justify-end space-x-2 mb-2">
              <span className="text-xs text-gray-400">Local Data</span>
              <Switch 
                checked={useFlaskData} 
                onCheckedChange={toggleDataSource} 
              />
              <span className="text-xs text-space-accent">Flask API</span>
            </div>
            
            {/* Main visualization */}
            <div className="lg:col-span-2 space-card h-[500px]">
              {useFlaskData ? (
                <DebrisSimulation3
                  selectedSatellite={selectedSatellite as any}
                  onSelectSatellite={handleSelectFlaskSatellite}
                  className="h-full"
                  apiEndpoint="http://localhost:5000/api/satellites/orbital-elements"
                />
              ) : (
                <DebrisSimulation
                  satellites={satellites}
                  selectedSatellite={selectedSatellite}
                  onSelectSatellite={handleSelectSatellite}
                  className="h-full"
                />
              )}
            </div>
            
            {/* Satellite Details & Time Controls */}
            <div className="flex flex-col space-y-4">
              <SatelliteDetails
                satellite={selectedSatellite}
                conjunctions={conjunctions}
              />
              
              <PredictionControls 
                onTimeChange={handleTimeChange}
              />
              
              <DangerThresholdControl
                value={dangerThreshold}
                onChange={handleThresholdChange}
              />
            </div>
            
            {/* Alert Log */}
            <div className="lg:col-span-3">
              <AlertsLog alerts={alerts} />
            </div>
            
            {/* Statistics Panel */}
            <div className="lg:col-span-3">
              <StatisticsPanel stats={satelliteStats} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Status bar */}
      <div className="h-6 px-4 bg-space-dark border-t border-space-grid flex items-center justify-between text-xs text-gray-400">
        <div>
          Tracking {satellites.length} objects | {conjunctions.length} potential conjunctions | Threshold: {dangerThreshold.toFixed(1)}km
        </div>
        <div>
          Simulation time: {simulationTime === 0 ? 'Current' : `+${simulationTime}h`} | 
          Data source: {useFlaskData ? 'Flask API' : 'Local'} |
          Data refresh: 60s
        </div>
      </div>
    </div>
  );
};

export default Index;
