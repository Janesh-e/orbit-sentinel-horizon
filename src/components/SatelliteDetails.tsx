
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Calendar, Download, ExternalLink, Flag, Globe, Info } from 'lucide-react';
import { SatelliteData, ConjunctionEvent } from '@/utils/satelliteData';
import { cn } from '@/lib/utils';

interface SatelliteDetailsProps {
  satellite: SatelliteData | null;
  conjunctions: ConjunctionEvent[];
  className?: string;
}

const SatelliteDetails: React.FC<SatelliteDetailsProps> = ({
  satellite,
  conjunctions,
  className
}) => {
  if (!satellite) {
    return (
      <Card className={cn("space-card text-center py-12", className)}>
        <CardContent>
          <Info className="h-12 w-12 text-space-grid mx-auto mb-4" />
          <p className="text-gray-400">
            Select a satellite or debris object to view details
          </p>
        </CardContent>
      </Card>
    );
  }

  // Filter conjunctions for this satellite
  const satelliteConjunctions = conjunctions.filter(
    (conj) => conj.primaryObject === satellite.id || conj.secondaryObject === satellite.id
  );
  
  // Format TLE data for display
  const formatTLE = (tleData?: string[]) => {
    if (!tleData || tleData.length < 2) return 'No TLE data available';
    
    return (
      <div className="font-mono text-xs overflow-x-auto bg-space-darker p-2 rounded">
        {tleData.map((line, index) => (
          <div key={index} className="whitespace-nowrap">{line}</div>
        ))}
      </div>
    );
  };

  return (
    <Card className={cn("space-card", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center">
              {satellite.name}
              {satellite.riskFactor && satellite.riskFactor >= 60 && (
                <AlertCircle className="ml-2 h-4 w-4 text-space-accent-alt" />
              )}
            </CardTitle>
            <p className="text-sm text-gray-400">{satellite.id}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="bg-space-darker border-space-grid text-white"
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </CardHeader>
      
      <Tabs defaultValue="info" className="w-full">
        <div className="px-6">
          <TabsList className="bg-space-dark border border-space-grid">
            <TabsTrigger value="info" className="data-[state=active]:bg-space-grid data-[state=active]:text-white">
              Information
            </TabsTrigger>
            <TabsTrigger value="orbit" className="data-[state=active]:bg-space-grid data-[state=active]:text-white">
              Orbital Data
            </TabsTrigger>
            <TabsTrigger value="conjunctions" className="data-[state=active]:bg-space-grid data-[state=active]:text-white">
              Conjunctions ({satelliteConjunctions.length})
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="info" className="px-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Type</p>
              <p className="text-sm text-white capitalize">{satellite.type}</p>
            </div>
            
            {satellite.launchDate && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Launch Date</p>
                <p className="text-sm text-white flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {satellite.launchDate}
                </p>
              </div>
            )}
            
            {satellite.country && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Country</p>
                <p className="text-sm text-white flex items-center">
                  <Flag className="h-3 w-3 mr-1" />
                  {satellite.country}
                </p>
              </div>
            )}
            
            {satellite.riskFactor !== undefined && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Risk Factor</p>
                <p className={cn(
                  "text-sm flex items-center",
                  satellite.riskFactor >= 60 ? "text-space-accent-alt" :
                  satellite.riskFactor >= 30 ? "text-yellow-400" : "text-green-400"
                )}>
                  {Math.round(satellite.riskFactor)}%
                  {satellite.riskFactor >= 60 && (
                    <AlertCircle className="ml-1 h-3 w-3" />
                  )}
                </p>
              </div>
            )}
          </div>
          
          <Separator className="my-4 bg-space-grid" />
          
          <div>
            <p className="text-xs text-gray-400 mb-2">Last Updated</p>
            <p className="text-sm text-white">
              {new Date(satellite.lastUpdated).toLocaleString()}
            </p>
          </div>
          
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              className="bg-space-darker border-space-grid text-white w-full"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              View Full Details
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="orbit" className="px-6 py-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Orbit Type</p>
              <p className="text-sm text-white">{satellite.orbitType}</p>
            </div>
            
            <div>
              <p className="text-xs text-gray-400 mb-1">Altitude</p>
              <p className="text-sm text-white">{Math.round(satellite.altitude)} km</p>
            </div>
            
            <div>
              <p className="text-xs text-gray-400 mb-1">Inclination</p>
              <p className="text-sm text-white">{satellite.inclination.toFixed(2)}°</p>
            </div>
            
            <div>
              <p className="text-xs text-gray-400 mb-1">Velocity</p>
              <p className="text-sm text-white">{satellite.velocity.toFixed(2)} km/s</p>
            </div>
          </div>
          
          <div className="mt-4">
            <p className="text-xs text-gray-400 mb-2">TLE Data</p>
            {formatTLE(satellite.tleData)}
          </div>
          
          <div className="mt-4 flex justify-between">
            <Button
              variant="outline"
              size="sm"
              className="bg-space-darker border-space-grid text-white"
            >
              <Globe className="h-4 w-4 mr-1" />
              Ground Track
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="bg-space-darker border-space-grid text-white"
            >
              <Download className="h-4 w-4 mr-1" />
              Export TLE
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="conjunctions" className="px-6 py-4">
          {satelliteConjunctions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No conjunction events recorded for this object.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {satelliteConjunctions.map((conj) => {
                const isPast = new Date(conj.time) < new Date();
                const isHighRisk = conj.probability > 0.01;
                
                return (
                  <div
                    key={conj.id}
                    className="p-3 bg-space-darker border border-space-grid rounded-md"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-white flex items-center">
                          {isPast ? 'Past' : 'Upcoming'} Conjunction
                          {isHighRisk && <AlertCircle className="ml-1 h-3 w-3 text-space-accent-alt" />}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {conj.primaryObject === satellite.id
                            ? `Secondary: ${conj.secondaryObject}`
                            : `Primary: ${conj.primaryObject}`
                          }
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-xs",
                          isPast ? "text-gray-400" : 
                          isHighRisk ? "text-space-accent-alt" : "text-space-accent"
                        )}>
                          {new Date(conj.time).toLocaleString()}
                        </p>
                        <p className="text-xs mt-1 text-gray-400">
                          {isPast ? 'Was' : 'Time to CA:'} {conj.timeToClosestApproach}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <div>
                        <p className="text-xs text-gray-400">Distance</p>
                        <p className="text-sm text-white">{conj.distance.toFixed(2)} km</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Probability</p>
                        <p className={cn(
                          "text-sm",
                          isHighRisk ? "text-space-accent-alt" : "text-white"
                        )}>
                          {(conj.probability * 100).toFixed(4)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Velocity</p>
                        <p className="text-sm text-white">{conj.relativeVelocity.toFixed(2)} km/s</p>
                      </div>
                    </div>
                    
                    {isPast && conj.isResolved && (
                      <div className="mt-2 text-xs">
                        <span className="text-green-400 font-medium">Resolved</span>
                        {conj.actionTaken && (
                          <span className="text-gray-400 ml-1">
                            — {conj.actionTaken}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              className="bg-space-darker border-space-grid text-white w-full"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              View All Conjunction History
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      
      <CardFooter className="border-t border-space-grid mt-4 pt-4 flex justify-between">
        <Button variant="default" size="sm" className="bg-space-accent hover:bg-space-accent/80">
          Subscribe to Alerts
        </Button>
        
        <Button variant="outline" size="sm" className="bg-space-darker border-space-grid text-white">
          Simulate Maneuver
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SatelliteDetails;
