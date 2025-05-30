
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Satellite, Trash2, AlertTriangle, Zap, RotateCcw } from 'lucide-react';
import axios from 'axios';

interface GraphNode {
  id: string;
  name: string;
  type: 'satellite' | 'debris';
  orbit_zone: string;
  risk_factor: number;
  semi_major_axis: number;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  weight: number;
  conjunction_time?: string;
  risk?: number;
  note?: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const SpaceTrafficGraph: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulation, setSimulation] = useState<d3.Simulation<GraphNode, GraphEdge> | null>(null);

  const width = 800;
  const height = 600;

  // Color schemes
  const nodeColors = {
    satellite: '#00d4ff',
    debris: '#ff6b6b'
  };

  const orbitColors = {
    LEO: '#4ade80',
    MEO: '#fbbf24',
    GEO: '#f87171',
    HEO: '#a78bfa'
  };

  const fetchGraphData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/space-traffic-graph');
      setGraphData(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching graph data:', err);
      setError('Failed to load space traffic data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !graphData.nodes.length) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current);
    
    // Create container groups
    const g = svg.append('g');
    const linksGroup = g.append('g').attr('class', 'links');
    const nodesGroup = g.append('g').attr('class', 'nodes');

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create force simulation
    const sim = d3.forceSimulation<GraphNode>(graphData.nodes)
      .force('link', d3.forceLink<GraphNode, GraphEdge>(graphData.edges)
        .id(d => d.id)
        .distance(d => {
          // Closer distance for conjunction edges, farther for cluster edges
          return d.note === 'same_orbit_cluster' ? 100 : 50;
        }))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(20));

    setSimulation(sim);

    // Create links
    const links = linksGroup
      .selectAll('line')
      .data(graphData.edges)
      .join('line')
      .style('stroke', d => {
        if (d.risk && d.risk > 0.5) return '#ff4444';
        if (d.note === 'same_orbit_cluster') return '#444';
        return '#888';
      })
      .style('stroke-width', d => {
        if (d.risk) return Math.max(1, d.risk * 5);
        return d.note === 'same_orbit_cluster' ? 1 : 2;
      })
      .style('stroke-opacity', d => d.note === 'same_orbit_cluster' ? 0.3 : 0.8)
      .style('stroke-dasharray', d => d.note === 'same_orbit_cluster' ? '5,5' : 'none');

    // Create nodes
    const nodes = nodesGroup
      .selectAll('circle')
      .data(graphData.nodes)
      .join('circle')
      .attr('r', d => Math.max(5, Math.min(15, d.risk_factor / 5)))
      .style('fill', d => nodeColors[d.type])
      .style('stroke', d => orbitColors[d.orbit_zone as keyof typeof orbitColors] || '#fff')
      .style('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        setSelectedNode(d);
        event.stopPropagation();
      })
      .on('mouseover', function(event, d) {
        d3.select(this).style('stroke-width', 4);
        
        // Highlight connected edges
        links.style('stroke-opacity', (l: GraphEdge) => {
          const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
          const targetId = typeof l.target === 'string' ? l.target : l.target.id;
          return sourceId === d.id || targetId === d.id ? 1 : 0.1;
        });
      })
      .on('mouseout', function() {
        d3.select(this).style('stroke-width', 2);
        links.style('stroke-opacity', d => d.note === 'same_orbit_cluster' ? 0.3 : 0.8);
      })
      .call(d3.drag<SVGCircleElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) sim.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) sim.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    // Add labels for important nodes
    const labels = nodesGroup
      .selectAll('text')
      .data(graphData.nodes.filter(d => d.risk_factor > 70))
      .join('text')
      .text(d => d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name)
      .style('font-size', '10px')
      .style('fill', '#fff')
      .style('text-anchor', 'middle')
      .style('pointer-events', 'none')
      .attr('dy', 25);

    // Update positions on simulation tick
    sim.on('tick', () => {
      links
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!);

      nodes
        .attr('cx', d => d.x!)
        .attr('cy', d => d.y!);

      labels
        .attr('x', d => d.x!)
        .attr('y', d => d.y!);
    });

    // Clear selection when clicking on empty space
    svg.on('click', () => setSelectedNode(null));

  }, [graphData]);

  const resetSimulation = () => {
    if (simulation) {
      simulation.alpha(1).restart();
    }
  };

  const getNodeIcon = (type: string) => {
    return type === 'satellite' ? <Satellite className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />;
  };

  const getRiskBadgeColor = (risk: number) => {
    if (risk > 80) return 'destructive';
    if (risk > 60) return 'default';
    return 'secondary';
  };

  return (
    <Card className="space-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-space-accent" />
            <span>Space Traffic Network</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetSimulation}
              disabled={loading}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchGraphData}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-gray-400">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-space-accent"></div>
            <span>Satellites</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Debris</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-4 h-0.5 bg-red-600"></div>
            <span>High Risk</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-4 h-0.5 bg-gray-600 opacity-50" style={{ strokeDasharray: '2,2' }}></div>
            <span>Orbit Cluster</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center h-96">
            <div className="text-gray-400">Loading space traffic data...</div>
          </div>
        )}
        
        {error && (
          <div className="flex items-center justify-center h-96">
            <div className="text-red-400 flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}
        
        {!loading && !error && (
          <div className="flex space-x-4">
            <div className="flex-1">
              <svg
                ref={svgRef}
                width={width}
                height={height}
                className="border border-space-grid rounded bg-space-darker"
              />
            </div>
            
            {selectedNode && (
              <div className="w-80 space-y-4">
                <Card className="bg-space-dark border-space-grid">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center space-x-2 text-lg">
                      {getNodeIcon(selectedNode.type)}
                      <span>{selectedNode.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{selectedNode.type}</Badge>
                      <Badge 
                        variant="outline"
                        style={{ 
                          borderColor: orbitColors[selectedNode.orbit_zone as keyof typeof orbitColors] || '#fff',
                          color: orbitColors[selectedNode.orbit_zone as keyof typeof orbitColors] || '#fff'
                        }}
                      >
                        {selectedNode.orbit_zone}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Risk Factor:</span>
                        <Badge variant={getRiskBadgeColor(selectedNode.risk_factor)}>
                          {selectedNode.risk_factor.toFixed(1)}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Semi-major Axis:</span>
                        <span>{selectedNode.semi_major_axis.toFixed(1)} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Altitude:</span>
                        <span>{(selectedNode.semi_major_axis - 6371).toFixed(1)} km</span>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-space-grid">
                      <h4 className="text-sm font-medium mb-2">Connected Objects:</h4>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {graphData.edges
                          .filter(edge => {
                            const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
                            const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
                            return sourceId === selectedNode.id || targetId === selectedNode.id;
                          })
                          .map((edge, idx) => {
                            const connectedId = typeof edge.source === 'string' 
                              ? (edge.source === selectedNode.id ? edge.target : edge.source)
                              : (edge.source.id === selectedNode.id ? (edge.target as GraphNode).id : edge.source.id);
                            const connectedNode = graphData.nodes.find(n => n.id === connectedId);
                            
                            return (
                              <div key={idx} className="text-xs flex items-center justify-between p-2 bg-space-darker rounded">
                                <div className="flex items-center space-x-1">
                                  {connectedNode && getNodeIcon(connectedNode.type)}
                                  <span>{connectedNode?.name.substring(0, 20)}...</span>
                                </div>
                                {edge.risk && (
                                  <Badge variant="destructive" className="text-xs">
                                    {(edge.risk * 100).toFixed(1)}%
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-4 text-xs text-gray-500">
          Network shows {graphData.nodes.length} objects and {graphData.edges.length} connections. 
          Click nodes for details, drag to reposition. Red edges indicate high collision risk.
        </div>
      </CardContent>
    </Card>
  );
};

export default SpaceTrafficGraph;
