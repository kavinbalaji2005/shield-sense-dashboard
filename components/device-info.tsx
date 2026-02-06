import React from "react";

interface DeviceInfoProps {
  deviceId: string;
  deviceName: string;
  gpsLat: number | null;
  gpsLon: number | null;
  lastUpdate: string;
  status: "normal" | "warning" | "critical" | "danger";
  sensorsReady: boolean;
}

export function DeviceInfo({
  deviceId,
  deviceName,
  gpsLat,
  gpsLon,
  lastUpdate,
  status,
  sensorsReady,
}: DeviceInfoProps) {
  const statusColors = {
    normal: "bg-green-500/20 text-green-400 border-green-500",
    warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500",
    critical: "bg-red-500/20 text-red-400 border-red-500",
    danger: "bg-red-500/20 text-red-400 border-red-500",
  };

  const normalizeTimestamp = (timestamp: string) => {
    if (!timestamp) return null;
    const trimmed = timestamp.trim();

    // If timestamp already includes timezone info (Z or +/-HH:MM), use as-is.
    if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
      const parsed = new Date(trimmed);
      if (Number.isNaN(parsed.getTime())) return null;

      // Heuristic: some devices send IST time but incorrectly tag it with Z (UTC).
      // If the parsed time differs from system time by ~5.5 hours, reinterpret as IST.
      const diffHours =
        Math.abs(Date.now() - parsed.getTime()) / (1000 * 60 * 60);
      if (/[zZ]$/.test(trimmed) && diffHours >= 5 && diffHours <= 6) {
        const assumedIst = trimmed.replace(/[zZ]$/, "+05:30");
        const reParsed = new Date(assumedIst);
        return Number.isNaN(reParsed.getTime()) ? parsed : reParsed;
      }

      return parsed;
    }

    // If timestamp looks like "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DDTHH:mm:ss" without TZ,
    // assume it's already in IST and append +05:30.
    const normalized = trimmed.includes("T")
      ? `${trimmed}+05:30`
      : `${trimmed.replace(" ", "T")}+05:30`;

    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatTime = (timestamp: string) => {
    const parsed = normalizeTimestamp(timestamp);
    if (!parsed) return "Invalid time";
    return parsed.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      timeZoneName: "short",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      timeZoneName: "short",
    });
  };

  const systemDate = new Date();

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{deviceName}</h2>
          <p className="text-sm text-muted-foreground mt-1">{deviceId}</p>
        </div>
        <div
          className={`px-4 py-2 rounded-md border text-xs font-semibold whitespace-nowrap ${statusColors[status]}`}
        >
          {status.toUpperCase()}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            GPS Location
          </p>
          <p className="text-sm font-semibold text-foreground mt-2">
            {gpsLat && gpsLon
              ? `${gpsLat.toFixed(4)}°, ${gpsLon.toFixed(4)}°`
              : "Unavailable"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Last Update
          </p>
          <p className="text-sm font-semibold text-foreground mt-2">
            {formatTime(lastUpdate)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            System Time: {formatDate(systemDate)}
          </p>
        </div>
      </div>

      {!sensorsReady && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md p-3">
          <p className="text-xs text-yellow-400 font-semibold flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            Sensors Initializing
          </p>
        </div>
      )}
    </div>
  );
}
