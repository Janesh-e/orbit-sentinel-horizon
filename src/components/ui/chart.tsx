
import React from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
  Sector,
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart as RechartsBarChart,
  Bar
} from 'recharts';

interface ChartProps {
  data: any[];
  className?: string;
}

const COLORS = [
  '#00D2FF',
  '#0B3D91',
  '#FF710D',
  '#FFB800',
  '#7F5AF0',
  '#2CB67D',
];

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-space-dark border border-space-grid p-2 rounded shadow-md text-xs">
        {label && <p className="font-semibold text-gray-300 mb-1">{label}</p>}
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-between space-x-8">
            <div style={{ color: entry.color }} className="font-medium">{entry.name}:</div>
            <div className="font-mono">{entry.value}</div>
          </div>
        ))}
      </div>
    );
  }

  return null;
};

// Custom active shape for Pie chart
const renderActiveShape = (props: any) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.8}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
    </g>
  );
};

export const PieChart = ({ data, className }: ChartProps) => {
  const [activeIndex, setActiveIndex] = React.useState(0);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <RechartsPieChart>
        <Pie
          activeIndex={activeIndex}
          activeShape={renderActiveShape}
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          onMouseEnter={onPieEnter}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Legend 
          layout="vertical" 
          verticalAlign="middle" 
          align="right" 
          wrapperStyle={{ fontSize: '12px' }}
        />
        <RechartsTooltip 
          content={<CustomTooltip />} 
        />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
};

export const AreaChart = ({ data, className }: ChartProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <RechartsAreaChart
        data={data}
        margin={{
          top: 10,
          right: 30,
          left: 0,
          bottom: 0,
        }}
      >
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00D2FF" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#00D2FF" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f293750" />
        <XAxis 
          dataKey="date" 
          stroke="#8791a350" 
          tick={{ fill: '#8791a3', fontSize: 12 }}
        />
        <YAxis 
          stroke="#8791a350" 
          tick={{ fill: '#8791a3', fontSize: 12 }}
        />
        <RechartsTooltip 
          content={<CustomTooltip />}
        />
        <Area 
          type="monotone" 
          dataKey="value" 
          name="Risk Score"
          stroke="#00D2FF" 
          fillOpacity={1} 
          fill="url(#colorValue)" 
        />
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
};

export const BarChart = ({ data, className }: ChartProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <RechartsBarChart
        data={data}
        margin={{
          top: 10,
          right: 30,
          left: 5,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1f293750" />
        <XAxis 
          dataKey="month" 
          stroke="#8791a350" 
          tick={{ fill: '#8791a3', fontSize: 12 }}
        />
        <YAxis 
          stroke="#8791a350" 
          tick={{ fill: '#8791a3', fontSize: 12 }}
        />
        <RechartsTooltip 
          content={<CustomTooltip />}
        />
        <Bar 
          dataKey="count" 
          name="Conjunctions"
          fill="#FF710D" 
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={`#FF710D${80 + 20 * (index % 2)}`} />
          ))}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};
