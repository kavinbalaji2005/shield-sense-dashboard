import React from "react";
import { AlertTriangle, AlertCircle, AlertOctagon } from "lucide-react";

interface Alert {
  id: string;
  severity: "warning" | "critical" | "danger";
  message: string;
  timestamp: string;
}

interface AlertsPanelProps {
  alerts: Alert[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "warning":
        return <AlertCircle className="w-4 h-4" />;
      case "critical":
      case "danger":
        return <AlertOctagon className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getSeverityColors = (severity: string) => {
    switch (severity) {
      case "warning":
        return "bg-yellow-500/10 border-yellow-500/30 text-yellow-400";
      case "critical":
      case "danger":
        return "bg-red-500/10 border-red-500/30 text-red-400";
      default:
        return "bg-gray-500/10 border-gray-500/30 text-gray-400";
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-foreground mb-5">
        Active Alerts
      </h3>

      {alerts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-foreground">No active alerts</p>
          <p className="text-xs text-muted-foreground mt-2">
            All systems operating normally
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`border rounded-md p-3 flex items-start gap-3 transition-all ${getSeverityColors(alert.severity)}`}
            >
              <div className="mt-1 flex-shrink-0">
                {getSeverityIcon(alert.severity)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{alert.message}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(alert.timestamp).toLocaleTimeString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    timeZoneName: "short",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
