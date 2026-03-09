"use client";

import React from "react";
import { MapPin, ExternalLink } from "lucide-react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useAdvancedMarkerRef,
} from "@vis.gl/react-google-maps";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

interface LocationMapProps {
  lat: number | null;
  lon: number | null;
  deviceName: string;
}

function DeviceMarker({
  lat,
  lon,
  deviceName,
}: {
  lat: number;
  lon: number;
  deviceName: string;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [infoOpen, setInfoOpen] = React.useState(false);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat, lng: lon }}
        onClick={() => setInfoOpen((o) => !o)}
        title={deviceName}
      >
        <Pin
          background="#ef4444"
          borderColor="#b91c1c"
          glyphColor="#ffffff"
          scale={1.3}
        />
      </AdvancedMarker>

      {infoOpen && (
        <InfoWindow anchor={marker} onCloseClick={() => setInfoOpen(false)}>
          <div className="text-sm font-semibold text-gray-900 leading-tight">
            {deviceName}
            <br />
            <span className="font-mono text-xs text-gray-600">
              {Math.abs(lat).toFixed(5)}°{lat >= 0 ? "N" : "S"},{" "}
              {Math.abs(lon).toFixed(5)}°{lon >= 0 ? "E" : "W"}
            </span>
          </div>
        </InfoWindow>
      )}
    </>
  );
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4 text-accent" />
          Device Location
        </h3>
        <a
          href={`https://www.google.com/maps?q=${lat!},${lon!}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-accent hover:underline"
        >
          Open in Google Maps
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="flex-1 rounded-md overflow-hidden border border-border min-h-0">
        <APIProvider apiKey={API_KEY}>
          <Map
            style={{ width: "100%", height: "100%" }}
            defaultCenter={{ lat: lat!, lng: lon! }}
            center={{ lat: lat!, lng: lon! }}
            defaultZoom={15}
            mapId="shield-sense-map"
            gestureHandling="cooperative"
            disableDefaultUI={false}
          >
            <DeviceMarker lat={lat!} lon={lon!} deviceName={deviceName} />
          </Map>
        </APIProvider>
      </div>

      <p className="mt-3 text-xs text-muted-foreground font-mono text-center">
        {Math.abs(lat!).toFixed(5)}°{lat! >= 0 ? "N" : "S"},{" "}
        {Math.abs(lon!).toFixed(5)}°{lon! >= 0 ? "E" : "W"}
      </p>
    </div>
  );
}
