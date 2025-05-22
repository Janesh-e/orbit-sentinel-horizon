
import React, { useState, useEffect } from 'react';
import { Bell, Database, Menu, Satellite, Shield, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface NavbarProps {
  toggleSidebar: () => void;
}

const timeZones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
];

const Navbar = ({ toggleSidebar }: NavbarProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedTimezone, setSelectedTimezone] = useState('UTC');
  const [formattedTime, setFormattedTime] = useState('');

  useEffect(() => {
    // Update time every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Format time based on selected timezone
    try {
      const options = {
        timeZone: selectedTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      } as Intl.DateTimeFormatOptions;

      setFormattedTime(new Intl.DateTimeFormat('en-US', options).format(currentTime));
    } catch (error) {
      console.error('Error formatting time:', error);
      setFormattedTime(currentTime.toISOString().replace('T', ' ').substring(0, 19));
    }
  }, [currentTime, selectedTimezone]);

  return (
    <div className="flex items-center justify-between h-16 px-6 bg-space-dark border-b border-space-grid">
      <div className="flex items-center">
        <Button 
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="text-gray-300 hover:text-space-accent mr-4"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center">
          <Satellite className="h-6 w-6 text-space-accent animate-pulse-glow" />
          <span className="ml-2 text-xl font-semibold tracking-wider text-white glow-text">
            ORBITAL<span className="text-space-accent">SHIELD</span>
          </span>
        </div>
      </div>

      <div className="font-mono text-sm text-space-accent flex items-center space-x-2">
        <Select
          value={selectedTimezone}
          onValueChange={setSelectedTimezone}
        >
          <SelectTrigger className="w-[180px] bg-space-darker border-space-grid text-xs">
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent className="bg-space-dark border-space-grid">
            {timeZones.map((timezone) => (
              <SelectItem 
                key={timezone.value} 
                value={timezone.value}
                className="text-xs"
              >
                {timezone.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span>{formattedTime}</span>
      </div>

      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" className="text-gray-300 hover:text-space-accent relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center">
            3
          </span>
        </Button>
        
        <Button variant="ghost" size="icon" className="text-gray-300 hover:text-space-accent">
          <Database className="h-5 w-5" />
        </Button>
        
        <Button variant="ghost" size="icon" className="text-gray-300 hover:text-space-accent">
          <Shield className="h-5 w-5" />
        </Button>
        
        <div className="w-8 h-8 rounded-full bg-space-blue flex items-center justify-center text-white">
          <User className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

export default Navbar;
