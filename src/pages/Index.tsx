
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import DebrisSimulation from '@/components/DebrisSimulation';
import StatisticsPanel from '@/components/StatisticsPanel';
import SatelliteList from '@/components/SatelliteList';
import SatelliteDetails from '@/components/SatelliteDetails';
import PredictionControls from '@/components/PredictionControls';
import { SatelliteData, ConjunctionEvent, generateInitialData, satelliteStats } from '@/utils/satelliteData';

const Index = () => {
  const [showSidebar, setShowSidebar] = useState(true);
  const [satellites, setSatellites] = useState<SatelliteData[]>([]);
  const [conjunctions, setConjunctions] = useState<ConjunctionEvent[]>([]);
  const [selectedSatellite, setSelectedSatellite] = useState<SatelliteData | null>(null);
  const [simulationTime, setSimulationTime] = useState(0); // hours ahead of current time

  // Initialize data
  useEffect(() => {
    const { satellites, conjunctions } = generateInitialData();
    setSatellites(satellites);
    setConjunctions(conjunctions);
  }, []);

  // Handle satellite selection
  const handleSelectSatellite = (satellite: SatelliteData) => {
    setSelectedSatellite(satellite);
  };

  // Handle time change in simulation
  const handleTimeChange = (hours: number) => {
    setSimulationTime(hours);
    // In a real app, you'd update satellite positions based on the time
  };

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
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
            {/* Main visualization */}
            <div className="lg:col-span-2 space-card h-[500px]">
              <DebrisSimulation
                satellites={satellites}
                selectedSatellite={selectedSatellite}
                onSelectSatellite={handleSelectSatellite}
                className="h-full"
              />
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
          Tracking {satellites.length} objects | {conjunctions.length} potential conjunctions
        </div>
        <div>
          Simulation time: {simulationTime === 0 ? 'Current' : `+${simulationTime}h`} | Data refresh: 60s
        </div>
      </div>
    </div>
  );
};

export default Index;
