
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AreaChart, BarChart, PieChart } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { AlertTriangle, Activity, Shield, Satellite } from 'lucide-react';

interface StatisticsPanelProps {
  className?: string;
  stats: {
    orbitDistribution: Record<string, number>;
    typeDistribution: Record<string, number>;
    riskTrend: Array<{ date: string; value: number }>;
    conjunctionsByMonth: Array<{ month: string; count: number }>;
  };
}

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ className, stats }) => {
  // Convert data for chart components
  const riskData = {
    data: stats.riskTrend,
    index: 'date',
    categories: ['value'],
    colors: ['#00D2FF'],
    valueFormatter: (value: number) => `${value}%`,
  };

  const orbitData = {
    data: Object.entries(stats.orbitDistribution).map(([name, value]) => ({
      name,
      value,
    })),
    index: 'name',
    categories: ['value'],
    colors: ['#00D2FF', '#0B3D91', '#FF710D', '#8A2BE2'],
    valueFormatter: (value: number) => `${value}%`,
  };

  const conjunctionData = {
    data: stats.conjunctionsByMonth,
    index: 'month',
    categories: ['count'],
    colors: ['#FF710D'],
    valueFormatter: (value: number) => `${value}`,
  };

  const totalDebris = Object.values(stats.typeDistribution).reduce((a, b) => a + b, 0);
  const activeObjs = stats.typeDistribution.active;
  const debrisObjs = stats.typeDistribution.debris;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-space-dark border-space-grid">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Risk Level</CardTitle>
            <AlertTriangle className="h-4 w-4 text-space-accent-alt" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats.riskTrend[stats.riskTrend.length - 1].value}%
            </div>
            <div className="text-xs text-gray-400">
              +4% from last month
            </div>
            <div className="mt-2 h-1 w-full bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-red-500"
                style={{ width: `${stats.riskTrend[stats.riskTrend.length - 1].value}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-space-dark border-space-grid">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Active Satellites</CardTitle>
            <Satellite className="h-4 w-4 text-space-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{activeObjs}</div>
            <div className="text-xs text-gray-400">
              {Math.round((activeObjs / totalDebris) * 100)}% of tracked objects
            </div>
            <div className="mt-2 h-1 w-full bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-space-accent"
                style={{ width: `${(activeObjs / totalDebris) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-space-dark border-space-grid">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Space Debris</CardTitle>
            <Activity className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{debrisObjs}</div>
            <div className="text-xs text-gray-400">
              {Math.round((debrisObjs / totalDebris) * 100)}% of tracked objects
            </div>
            <div className="mt-2 h-1 w-full bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500"
                style={{ width: `${(debrisObjs / totalDebris) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-space-dark border-space-grid">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Conjunction Alerts</CardTitle>
            <Shield className="h-4 w-4 text-space-accent-alt" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats.conjunctionsByMonth[stats.conjunctionsByMonth.length - 1].count}
            </div>
            <div className="text-xs text-gray-400">
              +8 from last month
            </div>
            <div className="mt-2 h-1 w-full bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-space-accent-alt"
                style={{ width: '67%' }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="risk" className="w-full">
        <TabsList className="bg-space-dark border border-space-grid mb-4">
          <TabsTrigger value="risk" className="data-[state=active]:bg-space-grid data-[state=active]:text-white">
            Risk Trend
          </TabsTrigger>
          <TabsTrigger value="orbit" className="data-[state=active]:bg-space-grid data-[state=active]:text-white">
            Orbit Distribution
          </TabsTrigger>
          <TabsTrigger value="conjunction" className="data-[state=active]:bg-space-grid data-[state=active]:text-white">
            Conjunctions
          </TabsTrigger>
        </TabsList>
        <TabsContent value="risk" className="mt-0">
          <Card className="bg-space-dark border-space-grid">
            <CardContent className="pt-6">
              <div className="h-[200px]">
                <AreaChart {...riskData} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="orbit" className="mt-0">
          <Card className="bg-space-dark border-space-grid">
            <CardContent className="pt-6">
              <div className="h-[200px]">
                <PieChart {...orbitData} />
              </div>
              <div className="flex justify-center mt-2 space-x-4 text-xs">
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-1 rounded-full bg-[#00D2FF]"></div>
                  <span>LEO</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-1 rounded-full bg-[#0B3D91]"></div>
                  <span>MEO</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-1 rounded-full bg-[#FF710D]"></div>
                  <span>GEO</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-1 rounded-full bg-[#8A2BE2]"></div>
                  <span>HEO</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="conjunction" className="mt-0">
          <Card className="bg-space-dark border-space-grid">
            <CardContent className="pt-6">
              <div className="h-[200px]">
                <BarChart {...conjunctionData} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StatisticsPanel;
