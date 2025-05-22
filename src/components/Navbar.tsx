
import React from 'react';
import { Bell, Database, Menu, Satellite, Shield, User } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface NavbarProps {
  toggleSidebar: () => void;
}

const Navbar = ({ toggleSidebar }: NavbarProps) => {
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

      <div className="font-mono text-sm text-space-accent">
        <div className="hidden md:block">
          <span className="mr-2">UTC:</span>
          <span>{new Date().toISOString().substring(0, 19).replace('T', ' ')}</span>
        </div>
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
