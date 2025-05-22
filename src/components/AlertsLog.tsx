
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface Alert {
  id: string;
  timestamp: Date;
  type: 'warning' | 'danger' | 'info' | 'success';
  message: string;
  details?: string;
  objectIds?: string[];
}

interface AlertsLogProps {
  alerts: Alert[];
  className?: string;
}

const AlertsLog: React.FC<AlertsLogProps> = ({ alerts, className }) => {
  // Format the time in HH:MM:SS format
  const formatTime = (date: Date): string => {
    return date.toTimeString().split(' ')[0];
  };

  // Get appropriate classes for each alert type
  const getAlertClasses = (type: Alert['type']): string => {
    switch (type) {
      case 'danger':
        return 'border-l-4 border-red-500 bg-red-500/10';
      case 'warning':
        return 'border-l-4 border-yellow-500 bg-yellow-500/10';
      case 'success':
        return 'border-l-4 border-green-500 bg-green-500/10';
      case 'info':
      default:
        return 'border-l-4 border-blue-500 bg-blue-500/10';
    }
  };

  // Get appropriate icon for each alert type
  const getAlertIcon = (type: Alert['type']): string => {
    switch (type) {
      case 'danger':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'success':
        return '✅';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className={cn("space-card h-full", className)}>
      <div className="border-b border-space-grid px-4 py-2 flex justify-between items-center bg-space-dark/80">
        <h3 className="font-semibold text-space-accent">Alert Log</h3>
        <div className="flex space-x-2 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/50 text-red-400">Critical</span>
          <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/50 text-yellow-400">Warning</span>
          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/50 text-blue-400">Info</span>
        </div>
      </div>
      <ScrollArea className="h-[250px]">
        <div className="p-2 space-y-1">
          {alerts.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No alerts to display</div>
          ) : (
            alerts.map((alert) => (
              <div 
                key={alert.id}
                className={cn(
                  "px-3 py-2 rounded text-xs space-y-1",
                  getAlertClasses(alert.type)
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center">
                    <span className="mr-2">{getAlertIcon(alert.type)}</span>
                    <span className="font-medium">{alert.message}</span>
                  </span>
                  <span className="text-gray-400">{formatTime(alert.timestamp)}</span>
                </div>
                {alert.details && (
                  <div className="text-gray-400 pl-5">{alert.details}</div>
                )}
                {alert.objectIds && alert.objectIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 pl-5 pt-1">
                    {alert.objectIds.map((id) => (
                      <span 
                        key={id} 
                        className="px-1.5 py-0.5 rounded-sm bg-space-overlay text-[10px] text-gray-300"
                      >
                        {id}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AlertsLog;
