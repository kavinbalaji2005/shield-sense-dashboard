import React from "react";
import { MapPin } from "lucide-react";

interface LocationMapProps {
  lat: number | null;
  lon: number | null;
  deviceName: string;
}

export function LocationMap({ lat, lon, deviceName }: LocationMapProps) {
  const latValid = lat !== null && Number.isFinite(lat);
  const lonValid = lon !== null && Number.isFinite(lon);

  if (!latValid || !lonValid) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 h-full flex flex-col items-center justify-center">
        <MapPin className="w-12 h-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">GPS Unavailable</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5 overflow-hidden h-full flex flex-col">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-accent" />
        Device Location
      </h3>
      {/* Fallback visual representation since we can't use real map without API key */}
      <div className="flex-1 bg-gradient-to-br from-slate-800 to-slate-900 rounded-md flex items-center justify-center border border-border">
        <div className="text-center">
          <div className="w-12 h-12 bg-accent/10 rounded-full mx-auto mb-3 flex items-center justify-center border border-accent/50">
            <MapPin className="w-6 h-6 text-accent" />
          </div>
          <p className="text-xs text-foreground font-mono">
            {Math.abs(lat).toFixed(4)}°{lat >= 0 ? "N" : "S"},{" "}
            {Math.abs(lon).toFixed(4)}°{lon >= 0 ? "E" : "W"}
          </p>
          <p className="text-xs text-muted-foreground mt-2">{deviceName}</p>
        </div>
      </div>
    </div>
  );
}
