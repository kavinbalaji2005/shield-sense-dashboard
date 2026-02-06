"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AlertCircle, Wifi, WifiOff } from "lucide-react";
import { DeviceInfo } from "@/components/device-info";
import { FlameDetector } from "@/components/flame-detector";
import { SensorGauge } from "@/components/sensor-gauge";
import { AlertsPanel } from "@/components/alerts-panel";
import { LocationMap } from "@/components/location-map";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { useToast } from "@/hooks/use-toast";

interface DeviceData {
  deviceId: string;
  timestamp: string;
  temperature: number;
  humidity: number;
  smoke_ppm: number;
  methane_ppm: number;
  carbonMonoxide_ppm: number;
  flame: number;
  gps_lat: number | null;
  gps_lon: number | null;
  sensorsReady: boolean;
  state: string;
}

interface Alert {
  id: string;
  severity: "warning" | "critical" | "danger";
  message: string;
  timestamp: string;
}

interface TimeseriesResponse {
  deviceId: string;
  metric?: string;
  count: number;
  points: Array<Record<string, number | string>>;
}

interface TimeseriesPoint {
  timestamp: string;
  value: number;
}

const API_ROOT = "https://inweplcszg.execute-api.ap-south-1.amazonaws.com/prod";
const POLL_INTERVAL = 5000; // 5 seconds
const STALE_MS = 15000; // 15 seconds

const normalizeTimestamp = (timestamp: string) => {
  if (!timestamp) return null;
  const trimmed = timestamp.trim();

  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;

    const diffHours =
      Math.abs(Date.now() - parsed.getTime()) / (1000 * 60 * 60);
    if (/[zZ]$/.test(trimmed) && diffHours >= 5 && diffHours <= 6) {
      const assumedIst = trimmed.replace(/[zZ]$/, "+05:30");
      const reParsed = new Date(assumedIst);
      return Number.isNaN(reParsed.getTime()) ? parsed : reParsed;
    }

    return parsed;
  }

  const normalized = trimmed.includes("T")
    ? `${trimmed}+05:30`
    : `${trimmed.replace(" ", "T")}+05:30`;

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatIstTime = (timestamp: string) => {
  const parsed = normalizeTimestamp(timestamp);
  if (!parsed) return "Invalid";
  const date = parsed.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
  });
  const time = parsed.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return `${date} ${time}`;
};

export default function ShieldSenseDashboard() {
  const [deviceData, setDeviceData] = useState<DeviceData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [lastAlertSeverity, setLastAlertSeverity] = useState<string | null>(
    null,
  );
  const [selectedDevice] = useState("ESP32-01");
  const [selectedMetric, setSelectedMetric] = useState("temperature");
  const [timeseriesLimit, setTimeseriesLimit] = useState(20);
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [timeseriesLoading, setTimeseriesLoading] = useState(false);
  const [timeseriesError, setTimeseriesError] = useState<string | null>(null);
  const { toast } = useToast();

  const deviceName = "ESP32-01"; // Declare deviceName
  const deviceId = selectedDevice;
  const deviceEndpoint = `${API_ROOT}/device/${deviceId}`;
  const timeseriesEndpoint = `${deviceEndpoint}/timeseries`;

  const metricOptions = useMemo(
    () => [
      { value: "temperature", label: "Temperature", unit: "°C" },
      { value: "humidity", label: "Humidity", unit: "%" },
      { value: "smoke", label: "Smoke", unit: "ppm" },
      { value: "methane", label: "Methane", unit: "ppm" },
      { value: "carbonMonoxide", label: "Carbon Monoxide", unit: "ppm" },
      { value: "pressure", label: "Pressure", unit: "" },
      { value: "flame", label: "Flame", unit: "" },
      { value: "alertLevel", label: "Alert Level", unit: "" },
    ],
    [],
  );

  const selectedMetricMeta =
    metricOptions.find((m) => m.value === selectedMetric) || metricOptions[0];

  // Fetch device data
  const fetchDeviceData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(deviceEndpoint);

      if (!response.ok) {
        throw new Error(`Failed to fetch device data: ${response.statusText}`);
      }

      const data: DeviceData = await response.json();
      setDeviceData(data);

      const parsedDate = normalizeTimestamp(data.timestamp);
      const isFresh = parsedDate
        ? Date.now() - parsedDate.getTime() <= STALE_MS
        : false;
      setIsOnline(isFresh);

      // Generate alerts based on firmware state + supplemental advisories
      const newAlerts: Alert[] = [];
      const timestamp = new Date().toISOString();

      if (data.state === "critical") {
        newAlerts.push({
          id: `state-critical-${timestamp}`,
          severity: "critical",
          message: "CRITICAL condition reported by device",
          timestamp,
        });
      } else if (data.state === "warning") {
        newAlerts.push({
          id: `state-warning-${timestamp}`,
          severity: "warning",
          message: "WARNING condition reported by device",
          timestamp,
        });
      }

      // During warmup, avoid gas alerts. Surface raw flame separately as unverified.
      if (!data.sensorsReady && data.flame === 1 && data.state !== "critical") {
        newAlerts.push({
          id: `flame-unverified-${timestamp}`,
          severity: "warning",
          message: "Flame sensor triggered (unverified during warmup)",
          timestamp,
        });
      }

      // Environmental advisory (not part of safety state)
      if (data.humidity < 30 || data.humidity > 70) {
        newAlerts.push({
          id: `humidity-advisory-${timestamp}`,
          severity: "warning",
          message: `Humidity advisory: ${data.humidity}%`,
          timestamp,
        });
      }

      // Check if alert severity has changed
      const highestSeverity =
        newAlerts.length > 0
          ? newAlerts.some((a) => a.severity === "critical")
            ? "critical"
            : "warning"
          : null;

      if (highestSeverity !== lastAlertSeverity) {
        if (highestSeverity === "critical") {
          toast({
            title: "⚠️ Critical Alert",
            description: "One or more critical conditions detected",
            variant: "destructive",
          });
        } else if (highestSeverity === "warning") {
          toast({
            title: "⚠️ Warning",
            description: "Warning conditions detected",
          });
        }
        setLastAlertSeverity(highestSeverity);
      }

      // Keep only the latest 10 alerts
      setAlerts((prevAlerts) => {
        const combined = [...newAlerts, ...prevAlerts];
        return combined.slice(0, 10);
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      setIsOnline(false);
      console.error("Error fetching device data:", err);
    } finally {
      setLoading(false);
    }
  }, [lastAlertSeverity, toast]);

  const fetchTimeseries = useCallback(async () => {
    try {
      setTimeseriesLoading(true);
      setTimeseriesError(null);
      const response = await fetch(
        `${timeseriesEndpoint}?limit=${timeseriesLimit}&metric=${encodeURIComponent(
          selectedMetric,
        )}`,
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch time-series data: ${response.statusText}`,
        );
      }

      const data: TimeseriesResponse = await response.json();
      const normalized = (data.points || [])
        .map((point) => {
          const rawValue =
            typeof point.value === "number"
              ? point.value
              : typeof point[selectedMetric] === "number"
                ? (point[selectedMetric] as number)
                : null;

          const timestamp =
            typeof point.timestamp === "string" ? point.timestamp : null;

          if (rawValue === null || !timestamp) {
            return null;
          }

          return { timestamp, value: rawValue };
        })
        .filter((point): point is TimeseriesPoint => point !== null)
        .sort(
          (a, b) =>
            (normalizeTimestamp(a.timestamp)?.getTime() ?? 0) -
            (normalizeTimestamp(b.timestamp)?.getTime() ?? 0),
        );

      setTimeseries(normalized);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setTimeseriesError(errorMessage);
      setTimeseries([]);
      console.error("Error fetching time-series data:", err);
    } finally {
      setTimeseriesLoading(false);
    }
  }, [selectedMetric, timeseriesEndpoint, timeseriesLimit]);

  // Poll device data
  useEffect(() => {
    fetchDeviceData();
    const interval = setInterval(fetchDeviceData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchDeviceData]);

  useEffect(() => {
    fetchTimeseries();
  }, [fetchTimeseries]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-secondary border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">
                ShieldSense
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Industrial Safety Monitoring
              </p>
            </div>
            <div>
              {isOnline ? (
                <div className="flex items-center gap-2 text-accent text-sm font-medium">
                  <Wifi className="w-4 h-4" />
                  <span>Online</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
                  <WifiOff className="w-4 h-4" />
                  <span>Offline</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Error State */}
        {error && (
          <div className="mb-8 bg-destructive/10 border border-destructive/30 rounded-md p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-destructive">
                Connection Error
              </p>
              <p className="text-xs text-destructive/80">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && !deviceData && (
          <div className="text-center py-16">
            <div className="inline-block">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
            <p className="mt-4 text-muted-foreground">
              Connecting to device...
            </p>
          </div>
        )}

        {/* Dashboard Grid */}
        {deviceData && (
          <div className="space-y-6">
            {/* Top Section - Device Info and Flame */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <DeviceInfo
                  deviceId={deviceData.deviceId}
                  deviceName="ESP32-01"
                  gpsLat={deviceData.gps_lat}
                  gpsLon={deviceData.gps_lon}
                  lastUpdate={deviceData.timestamp}
                  status={deviceData.state as any}
                  sensorsReady={deviceData.sensorsReady}
                />
              </div>
              <div>
                <FlameDetector detected={deviceData.flame === 1} />
              </div>
            </div>

            {/* Sensor Gauges */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-6">
                Sensor Readings
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                <div className="bg-card border border-border rounded-lg p-4">
                  <SensorGauge
                    label="Carbon Monoxide"
                    value={deviceData.carbonMonoxide_ppm}
                    max={100}
                    unit="ppm"
                    warningThreshold={25}
                    criticalThreshold={50}
                  />
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <SensorGauge
                    label="Smoke"
                    value={deviceData.smoke_ppm}
                    max={500}
                    unit="ppm"
                    warningThreshold={80}
                    criticalThreshold={300}
                  />
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <SensorGauge
                    label="Methane"
                    value={deviceData.methane_ppm}
                    max={10000}
                    unit="ppm"
                    warningThreshold={2500}
                    criticalThreshold={5000}
                  />
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <SensorGauge
                    label="Temperature"
                    value={deviceData.temperature}
                    max={100}
                    unit="°C"
                    warningThreshold={55}
                    criticalThreshold={75}
                  />
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <SensorGauge
                    label="Humidity"
                    value={deviceData.humidity}
                    max={100}
                    unit="%"
                    warningThreshold={70}
                    criticalThreshold={90}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Section - Location and Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-1 h-96">
                <LocationMap
                  lat={deviceData.gps_lat}
                  lon={deviceData.gps_lon}
                  deviceName="ESP32-01"
                />
              </div>
              <div className="lg:col-span-2">
                <AlertsPanel alerts={alerts} />
              </div>
            </div>

            {/* Time-Series Section */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Time-Series Data
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Latest {timeseriesLimit} readings for {deviceId}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="limit-input"
                      className="text-xs text-muted-foreground"
                    >
                      Last readings
                    </label>
                    <input
                      id="limit-input"
                      type="number"
                      min={1}
                      max={500}
                      value={timeseriesLimit}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value);
                        setTimeseriesLimit(
                          Number.isFinite(nextValue) && nextValue > 0
                            ? Math.min(nextValue, 500)
                            : 1,
                        );
                      }}
                      className="bg-background border border-border rounded-md px-2 py-1 text-sm w-20"
                    />
                  </div>
                  <label
                    htmlFor="metric-select"
                    className="text-xs text-muted-foreground"
                  >
                    Metric
                  </label>
                  <select
                    id="metric-select"
                    value={selectedMetric}
                    onChange={(event) => setSelectedMetric(event.target.value)}
                    className="bg-background border border-border rounded-md px-2 py-1 text-sm"
                  >
                    {metricOptions.map((metric) => (
                      <option key={metric.value} value={metric.value}>
                        {metric.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {timeseriesError && (
                <div className="mb-4 bg-destructive/10 border border-destructive/30 rounded-md p-3 text-xs text-destructive">
                  {timeseriesError}
                </div>
              )}

              {timeseriesLoading ? (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  Loading chart...
                </div>
              ) : timeseries.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  No time-series data available.
                </div>
              ) : (
                <ChartContainer
                  config={{
                    value: {
                      label: selectedMetricMeta.label,
                      color: "var(--chart-2)",
                    },
                  }}
                  className="h-64 w-full"
                >
                  <LineChart data={timeseries} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value) => formatIstTime(String(value))}
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tickFormatter={(value) =>
                        `${value}${selectedMetricMeta.unit}`
                      }
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(label) =>
                            formatIstTime(String(label))
                          }
                        />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="var(--color-value)"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ChartContainer>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
