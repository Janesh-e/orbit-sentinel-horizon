
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Calendar, Download, ExternalLink, Flag, Globe, Info, Trash2, Satellite } from 'lucide-react';
import { SatelliteData, ConjunctionEvent } from '@/utils/satelliteData';
import { useSatelliteDetails } from '@/hooks/useSatelliteDetails';
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
  // Fetch detailed satellite/debris data using the new API
  const { details, loading, error } = useSatelliteDetails(satellite?.id || null);
  
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

  // Use detailed data if available, fallback to satellite prop data
  const displayData = details || satellite;
  const isDebris = satellite.type === 'debris';
  const objectConjunctions = conjunctions.filter(
    (conj) => conj.primaryObject === satellite.id || conj.secondaryObject === satellite.id
  );
  
  const formatTLE = (tleData?: string[] | { line1: string; line2: string }) => {
    if (!tleData) return 'No TLE data available';
    
    if (Array.isArray(tleData) && tleData.length >= 2) {
      return (
        <div className="font-mono text-xs overflow-x-auto bg-space-darker p-2 rounded">
          {tleData.map((line, index) => (
            <div key={index} className="whitespace-nowrap">{line}</div>
          ))}
        </div>
      );
    }
    
    if (typeof tleData === 'object' && 'line1' in tleData && 'line2' in tleData) {
      return (
        <div className="font-mono text-xs overflow-x-auto bg-space-darker p-2 rounded">
          <div className="whitespace-nowrap">{tleData.line1}</div>
          <div className="whitespace-nowrap">{tleData.line2}</div>
        </div>
      );
    }
    
    return 'No TLE data available';
  };

  return (
    <Card className={cn("space-card", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center">
              {isDebris ? (
                <Trash2 className="mr-2 h-5 w-5 text-gray-400" />
              ) : (
                <Satellite className="mr-2 h-5 w-5 text-space-accent" />
              )}
              {displayData.name}
              {displayData.riskFactor && displayData.riskFactor >= 60 && (
                <AlertCircle className="ml-2 h-4 w-4 text-space-accent-alt" />
              )}
            </CardTitle>
            <p className="text-sm text-gray-400">
              {displayData.id} • {isDebris ? 'Space Debris' : 'Active Satellite'}
            </p>
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
              Conjunctions ({objectConjunctions.length})
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="info" className="px-6 py-4">
          {loading && (
            <div className="text-center py-4">
              <div className="text-sm text-gray-400">Loading detailed information...</div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded p-3 mb-4">
              <div className="text-sm text-red-400">Error loading details: {error}</div>
              <div className="text-xs text-gray-400 mt-1">Using cached data</div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Type</p>
              <p className="text-sm text-white capitalize flex items-center">
                {isDebris ? (
                  <>
                    <Trash2 className="h-3 w-3 mr-1 text-gray-400" />
                    Space Debris
                  </>
                ) : (
                  <>
                    <Satellite className="h-3 w-3 mr-1 text-space-accent" />
                    Active Satellite
                  </>
                )}
              </p>
            </div>
            
            {(displayData.launchDate || satellite.launchDate) && (
              <div>
                <p className="text-xs text-gray-400 mb-1">
                  {isDebris ? 'Fragment Date' : 'Launch Date'}
                </p>
                <p className="text-sm text-white flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {displayData.launchDate || satellite.launchDate}
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
            
            {displayData.riskFactor !== undefined && (
              <div>
                <p className="text-xs text-gray-400 mb-1">
                  {isDebris ? 'Collision Risk' : 'Risk Factor'}
                </p>
                <p className={cn(
                  "text-sm flex items-center",
                  displayData.riskFactor >= 60 ? "text-space-accent-alt" :
                  displayData.riskFactor >= 30 ? "text-yellow-400" : "text-green-400"
                )}>
                  {Math.round(displayData.riskFactor)}%
                  {displayData.riskFactor >= 60 && (
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
              {displayData.lastUpdated ? 
                new Date(displayData.lastUpdated).toLocaleString() :
                new Date(satellite.lastUpdated).toLocaleString()
              }
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
              <p className="text-sm text-white">{displayData.orbitType || satellite.orbitType}</p>
            </div>
            
            <div>
              <p className="text-xs text-gray-400 mb-1">Altitude</p>
              <p className="text-sm text-white">
                {Math.round(
                  details?.altitude_km || satellite.altitude
                )} km
              </p>
            </div>
            
            <div>
              <p className="text-xs text-gray-400 mb-1">Inclination</p>
              <p className="text-sm text-white">
                {(details?.inclination_deg || satellite.inclination).toFixed(2)}°
              </p>
            </div>
            
            <div>
              <p className="text-xs text-gray-400 mb-1">Velocity</p>
              <p className="text-sm text-white">
                {(details?.velocity_km_s || satellite.velocity).toFixed(2)} km/s
              </p>
            </div>
          </div>
          
          <div className="mt-4">
            <p className="text-xs text-gray-400 mb-2">TLE Data</p>
            {formatTLE(details?.tle || satellite.tleData)}
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
          {objectConjunctions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No conjunction events recorded for this {isDebris ? 'debris object' : 'satellite'}.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {objectConjunctions.map((conj) => {
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
        
        {!isDebris && (
          <Button variant="outline" size="sm" className="bg-space-darker border-space-grid text-white">
            Simulate Maneuver
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default SatelliteDetails;
