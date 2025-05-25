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
import axios from 'axios';

const Index = () => {
  const [showSidebar, setShowSidebar] = useState(true);
  const [satellites, setSatellites] = useState<SatelliteData[]>([]);
  const [flaskSatellites, setFlaskSatellites] = useState<any[]>([]);
  const [flaskDebris, setFlaskDebris] = useState<any[]>([]);
  const [allSpaceObjects, setAllSpaceObjects] = useState<any[]>([]);
  const [conjunctions, setConjunctions] = useState<ConjunctionEvent[]>([]);
  const [selectedSatellite, setSelectedSatellite] = useState<SatelliteData | null>(null);
  const [simulationTime, setSimulationTime] = useState(0);
  const [dangerThreshold, setDangerThreshold] = useState(5.0);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [useFlaskData, setUseFlaskData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedSatellite, setHighlightedSatellite] = useState<string | null>(null);
  const [filteredSatelliteId, setFilteredSatelliteId] = useState<string | null>(null);

  // Centralized data fetching for Flask data
  const fetchFlaskData = async () => {
    try {
      console.log('Fetching Flask satellite and debris data...');
      
      // Fetch satellites
      const satelliteResponse = await axios.get('http://localhost:5000/api/satellites/orbital-elements');
      console.log('Flask satellite data received:', satelliteResponse.data.length, 'satellites');
      
      // Fetch debris
      const debrisResponse = await axios.get('http://localhost:5000/api/debris/orbital-elements');
      console.log('Flask debris data received:', debrisResponse.data.length, 'debris');
      
      // Process satellite data
      const processedSatellites = satelliteResponse.data.map((sat: any, index: number) => ({
        ...sat,
        id: sat.id || String(index),
        name: sat.name || `Satellite ${index}`,
        type: 'satellite',
        riskFactor: sat.riskFactor || 0
      }));
      
      // Process debris data with unique IDs
      const processedDebris = debrisResponse.data.map((debris: any, index: number) => ({
        ...debris,
        id: `debris_${debris.id || index}`, // Prefix to avoid ID conflicts
        name: debris.name || `Debris ${index}`,
        type: 'debris',
        riskFactor: debris.riskFactor || 0
      }));
      
      // Combine all space objects
      const combinedObjects = [...processedSatellites, ...processedDebris];
      
      setFlaskSatellites(processedSatellites);
      setFlaskDebris(processedDebris);
      setAllSpaceObjects(combinedObjects);
      
      console.log('Processed data:', processedSatellites.length, 'satellites,', processedDebris.length, 'debris');
      return combinedObjects;
    } catch (error) {
      console.error('Error fetching Flask data:', error);
      return [];
    }
  };

  // Fetch Flask data
  useEffect(() => {
    if (useFlaskData) {
      fetchFlaskData();
      const interval = setInterval(fetchFlaskData, 60000);
      return () => clearInterval(interval);
    }
  }, [useFlaskData]);

  // Initialize dummy data
  useEffect(() => {
    if (!useFlaskData) {
      const { satellites, conjunctions } = generateInitialData();
      setSatellites(satellites);
      setConjunctions(conjunctions);
      
      const initialAlerts = generateAlertsFromConjunctions(conjunctions);
      setAlerts(initialAlerts);
    }
  }, [useFlaskData]);

  // Generate alerts from conjunctions
  const generateAlertsFromConjunctions = (conjs: ConjunctionEvent[]): Alert[] => {
    return conjs
      .filter(conj => conj.distance < dangerThreshold)
      .map(conj => {
        const alertType = getAlertTypeFromDistance(conj.distance);
        return {
          id: `alert-${conj.id}`,
          timestamp: new Date(conj.time),
          type: alertType,
          message: `Potential collision detected between ${conj.primaryObject} and ${conj.secondaryObject}`,
          details: `Distance: ${conj.distance.toFixed(2)}km | Probability: ${(conj.probability * 100).toFixed(2)}% | Time to closest approach: ${conj.timeToClosestApproach}`,
          objectIds: [conj.primaryObject, conj.secondaryObject]
        };
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20);
  };

  // Get alert type based on distance
  const getAlertTypeFromDistance = (distance: number): Alert['type'] => {
    if (distance < 2) return 'danger';
    if (distance < 5) return 'warning';
    return 'info';
  };

  // Enhanced satellite selection handlers
  const handleSelectSatellite = (satellite: SatelliteData) => {
    console.log('Selecting dummy satellite:', satellite.id, satellite.name);
    setSelectedSatellite(satellite);
    setHighlightedSatellite(satellite.id);
    
    const newAlert: Alert = {
      id: `select-${Date.now()}`,
      timestamp: new Date(),
      type: 'info',
      message: `Selected ${satellite.type}: ${satellite.name}`,
      details: `Orbit: ${satellite.orbitType} | Inclination: ${satellite.inclination.toFixed(2)}° | Altitude: ${satellite.altitude.toFixed(2)}km`
    };
    
    setAlerts(prev => [newAlert, ...prev].slice(0, 50));
  };

  const handleSelectFlaskObject = (spaceObject: any) => {
    console.log('Selecting Flask space object:', spaceObject.id, spaceObject.name, spaceObject.type);
    
    const convertedObject: SatelliteData = {
      id: spaceObject.id,
      name: spaceObject.name,
      type: spaceObject.type,
      orbitType: spaceObject.orbitType,
      inclination: spaceObject.inclination * 180 / Math.PI,
      altitude: spaceObject.semiMajorAxis ? spaceObject.semiMajorAxis - 6371 : 0,
      velocity: 0,
      launchDate: new Date().toISOString(),
      position: spaceObject.currentPosition || { x: 0, y: 0, z: 0 },
      riskFactor: spaceObject.riskFactor || 0,
      size: spaceObject.size || 1,
      collisionProbability: spaceObject.collisionProbability || 0,
      lastUpdated: new Date().toISOString()
    };
    
    setSelectedSatellite(convertedObject);
    setHighlightedSatellite(spaceObject.id);
    
    const newAlert: Alert = {
      id: `select-${Date.now()}`,
      timestamp: new Date(),
      type: 'info',
      message: `Selected ${spaceObject.type}: ${spaceObject.name}`,
      details: `Orbit: ${spaceObject.orbitType} | Inclination: ${(spaceObject.inclination * 180 / Math.PI).toFixed(2)}°`
    };
    
    setAlerts(prev => [newAlert, ...prev].slice(0, 50));
  };

  // Enhanced search functionality
  const handleSearch = (term: string) => {
    console.log('Search term:', term);
    setSearchTerm(term);
    
    if (term && useFlaskData) {
      const foundObject = allSpaceObjects.find(obj => 
        obj.name.toLowerCase().includes(term.toLowerCase()) || 
        obj.id.toLowerCase().includes(term.toLowerCase())
      );
      if (foundObject) {
        console.log('Found space object for search:', foundObject.id, foundObject.name, foundObject.type);
        setHighlightedSatellite(foundObject.id);
        setFilteredSatelliteId(null);
      } else {
        console.log('No space object found for search term:', term);
        setHighlightedSatellite(null);
      }
    } else if (term && !useFlaskData) {
      const foundSatellite = satellites.find(sat => 
        sat.name.toLowerCase().includes(term.toLowerCase()) || 
        sat.id.toLowerCase().includes(term.toLowerCase())
      );
      if (foundSatellite) {
        console.log('Found dummy satellite for search:', foundSatellite.id, foundSatellite.name);
        setHighlightedSatellite(foundSatellite.id);
        setFilteredSatelliteId(null);
      } else {
        console.log('No dummy satellite found for search term:', term);
        setHighlightedSatellite(null);
      }
    } else {
      setHighlightedSatellite(null);
      setFilteredSatelliteId(null);
    }
  };

  // Enhanced filter functionality
  const handleFilterSatellite = (objectId: string) => {
    console.log('Filter space object:', objectId);
    
    if (filteredSatelliteId === objectId) {
      setFilteredSatelliteId(null);
      setHighlightedSatellite(null);
    } else {
      setFilteredSatelliteId(objectId);
      setHighlightedSatellite(objectId);
      setSearchTerm('');
    }
  };

  // Handle time change in simulation
  const handleTimeChange = (hours: number) => {
    setSimulationTime(hours);
    
    if (hours !== 0) {
      const newAlert: Alert = {
        id: `time-${Date.now()}`,
        timestamp: new Date(),
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
    
    const updatedAlerts = generateAlertsFromConjunctions(conjunctions);
    
    const thresholdAlert: Alert = {
      id: `threshold-${Date.now()}`,
      timestamp: new Date(),
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
    setHighlightedSatellite(null);
    setFilteredSatelliteId(null);
    setSearchTerm('');
    setSelectedSatellite(null);
    
    const dataSourceAlert: Alert = {
      id: `data-source-${Date.now()}`,
      timestamp: new Date(),
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
        {showSidebar && (
          <div className="w-80 border-r border-space-grid bg-space-dark overflow-y-auto flex-shrink-0">
            <div className="p-4">
              <SatelliteList
                satellites={useFlaskData ? allSpaceObjects : satellites}
                selectedSatellite={selectedSatellite}
                onSelectSatellite={useFlaskData ? handleSelectFlaskObject : handleSelectSatellite}
                onSearch={handleSearch}
                onFilterSatellite={handleFilterSatellite}
                highlightedSatellite={highlightedSatellite}
                isFlaskData={useFlaskData}
              />
            </div>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 flex items-center justify-end space-x-2 mb-2">
              <span className="text-xs text-gray-400">Local Data</span>
              <Switch 
                checked={useFlaskData} 
                onCheckedChange={toggleDataSource} 
              />
              <span className="text-xs text-space-accent">Flask API</span>
            </div>
            
            <div className="lg:col-span-2 space-card h-[500px]">
              {useFlaskData ? (
                <DebrisSimulation3
                  selectedSatellite={selectedSatellite as any}
                  onSelectSatellite={handleSelectFlaskObject}
                  highlightedSatellite={highlightedSatellite}
                  filteredSatelliteId={filteredSatelliteId}
                  className="h-full"
                  apiEndpoint="http://localhost:5000/api/satellites/orbital-elements"
                  satellites={allSpaceObjects}
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
            
            <div className="lg:col-span-3">
              <AlertsLog alerts={alerts} />
            </div>
            
            <div className="lg:col-span-3">
              <StatisticsPanel stats={satelliteStats} />
            </div>
          </div>
        </div>
      </div>
      
      <div className="h-6 px-4 bg-space-dark border-t border-space-grid flex items-center justify-between text-xs text-gray-400">
        <div>
          Tracking {useFlaskData ? allSpaceObjects.length : satellites.length} objects 
          {useFlaskData && ` (${flaskSatellites.length} satellites, ${flaskDebris.length} debris)`} | 
          {conjunctions.length} potential conjunctions | Threshold: {dangerThreshold.toFixed(1)}km
        </div>
        <div>
          Simulation time: {simulationTime === 0 ? 'Current' : `+${simulationTime}h`} | 
          Data source: {useFlaskData ? 'Flask API' : 'Local'} |
          {filteredSatelliteId && ' Filtered: 1 object |'}
          Data refresh: 60s
        </div>
      </div>
    </div>
  );
};

export default Index;
