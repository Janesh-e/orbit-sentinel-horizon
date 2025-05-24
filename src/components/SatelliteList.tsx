
import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Satellite, Filter, ChevronDown, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { SatelliteData } from '@/utils/satelliteData';
import { cn } from '@/lib/utils';

interface SatelliteListProps {
  satellites: any[];
  onSelectSatellite: (satellite: any) => void;
  selectedSatellite: SatelliteData | null;
  onSearch?: (term: string) => void;
  onFilterSatellite?: (satelliteId: string) => void;
  highlightedSatellite?: string | null;
  isFlaskData?: boolean;
  className?: string;
}

const SatelliteList: React.FC<SatelliteListProps> = ({
  satellites,
  onSelectSatellite,
  selectedSatellite,
  onSearch,
  onFilterSatellite,
  highlightedSatellite,
  isFlaskData = false,
  className
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [orbitFilter, setOrbitFilter] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState<string | null>(null);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    onSearch?.(value);
  };

  const filteredSatellites = useMemo(() => {
    return satellites.filter((sat) => {
      // Apply search term filter
      if (
        searchTerm &&
        !sat.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !sat.id.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // Apply type filter
      if (typeFilter && sat.type !== typeFilter) {
        return false;
      }

      // Apply orbit filter
      if (orbitFilter && sat.orbitType !== orbitFilter) {
        return false;
      }

      // Apply risk filter
      if (riskFilter) {
        const riskFactor = sat.riskFactor || 0;
        if (riskFilter === 'high' && riskFactor < 60) {
          return false;
        }
        if (riskFilter === 'medium' && (riskFactor < 30 || riskFactor >= 60)) {
          return false;
        }
        if (riskFilter === 'low' && riskFactor >= 30) {
          return false;
        }
      }

      return true;
    });
  }, [satellites, searchTerm, typeFilter, orbitFilter, riskFilter]);

  const getSatelliteAltitude = (sat: any) => {
    if (isFlaskData) {
      // Calculate altitude from position if available
      if (sat.currentPosition) {
        const { x, y, z } = sat.currentPosition;
        return Math.sqrt(x * x + y * y + z * z) - 6371;
      }
      // Calculate from semi-major axis
      return sat.semiMajorAxis ? sat.semiMajorAxis - 6371 : 0;
    }
    return sat.altitude || 0;
  };

  return (
    <div className={cn("space-card", className)}>
      <div className="p-4 border-b border-space-grid">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            {isFlaskData ? 'Live Satellites' : 'Space Objects'}
          </h3>
          <div className="text-xs text-gray-400">
            {filteredSatellites.length} of {satellites.length} objects
          </div>
        </div>

        <div className="mt-2 flex flex-col space-y-2">
          <Input
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="bg-space-darker border-space-grid text-white"
          />
          
          <div className="flex space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-space-darker border-space-grid text-white w-full">
                  <Filter className="h-4 w-4 mr-1" />
                  Type {typeFilter && `(${typeFilter})`}
                  <ChevronDown className="h-4 w-4 ml-auto" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-space-dark border-space-grid text-white">
                <DropdownMenuItem onClick={() => setTypeFilter(null)}>
                  All Types
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter('satellite')}>
                  Satellites
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter('debris')}>
                  Debris
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-space-darker border-space-grid text-white w-full">
                  <Filter className="h-4 w-4 mr-1" />
                  Orbit {orbitFilter && `(${orbitFilter})`}
                  <ChevronDown className="h-4 w-4 ml-auto" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-space-dark border-space-grid text-white">
                <DropdownMenuItem onClick={() => setOrbitFilter(null)}>
                  All Orbits
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOrbitFilter('LEO')}>
                  LEO
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOrbitFilter('MEO')}>
                  MEO
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOrbitFilter('GEO')}>
                  GEO
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOrbitFilter('HEO')}>
                  HEO
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-space-darker border-space-grid text-white w-full">
                  <Filter className="h-4 w-4 mr-1" />
                  Risk {riskFilter && `(${riskFilter})`}
                  <ChevronDown className="h-4 w-4 ml-auto" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-space-dark border-space-grid text-white">
                <DropdownMenuItem onClick={() => setRiskFilter(null)}>
                  All Risk Levels
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRiskFilter('high')}>
                  High Risk
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRiskFilter('medium')}>
                  Medium Risk
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRiskFilter('low')}>
                  Low Risk
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="max-h-[400px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-space-dark">
            <TableRow className="hover:bg-space-dark border-space-grid">
              <TableHead className="text-gray-400 w-12"></TableHead>
              <TableHead className="text-gray-400">Name</TableHead>
              <TableHead className="text-gray-400">Orbit</TableHead>
              <TableHead className="text-gray-400">Risk</TableHead>
              <TableHead className="text-gray-400 hidden md:table-cell">Type</TableHead>
              <TableHead className="text-gray-400 hidden md:table-cell">Altitude (km)</TableHead>
              <TableHead className="text-gray-400 w-12">Filter</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSatellites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                  No space objects found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredSatellites.map((satellite) => {
                const isSelected = selectedSatellite && selectedSatellite.id === satellite.id;
                const isHighlighted = highlightedSatellite === satellite.id;
                const isHighRisk = satellite.riskFactor && satellite.riskFactor >= 60;
                const altitude = getSatelliteAltitude(satellite);
                
                return (
                  <TableRow
                    key={satellite.id}
                    className={cn(
                      "cursor-pointer border-space-grid",
                      isSelected ? "bg-space-blue bg-opacity-20" : "hover:bg-space-dark hover:bg-opacity-70",
                      isHighlighted ? "bg-space-accent bg-opacity-10 border-space-accent" : ""
                    )}
                    onClick={() => onSelectSatellite(satellite)}
                  >
                    <TableCell className="py-2">
                      {satellite.type === 'satellite' ? (
                        <Satellite className={cn(
                          "h-4 w-4", 
                          isHighRisk ? "text-space-accent-alt" : "text-space-accent"
                        )} />
                      ) : (
                        <div className="h-3 w-3 rounded-full bg-gray-400" />
                      )}
                    </TableCell>
                    <TableCell className="py-2 font-medium text-white">
                      {satellite.name}
                      <div className="text-xs text-gray-400">{satellite.id}</div>
                    </TableCell>
                    <TableCell className="py-2">{satellite.orbitType}</TableCell>
                    <TableCell className="py-2">
                      {satellite.riskFactor !== undefined && (
                        <div className="flex items-center">
                          {isHighRisk && <AlertTriangle className="h-3 w-3 text-space-accent-alt mr-1" />}
                          <div className={cn(
                            "text-xs",
                            isHighRisk ? "text-space-accent-alt" : 
                            satellite.riskFactor >= 30 ? "text-yellow-400" : "text-green-400"
                          )}>
                            {Math.round(satellite.riskFactor)}%
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-2 hidden md:table-cell capitalize">
                      {satellite.type}
                    </TableCell>
                    <TableCell className="py-2 hidden md:table-cell">
                      {Math.round(altitude)}
                    </TableCell>
                    <TableCell className="py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onFilterSatellite?.(satellite.id);
                        }}
                        className={cn(
                          "h-6 w-6 p-0",
                          isHighlighted ? "text-space-accent" : "text-gray-400"
                        )}
                      >
                        {isHighlighted ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default SatelliteList;
