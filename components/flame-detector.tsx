import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface FlameDetectorProps {
  detected: boolean;
}

export function FlameDetector({ detected }: FlameDetectorProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-8 h-full flex flex-col items-center justify-center">
      <div className="relative mb-6">
        {detected && (
          <>
            <div className="absolute inset-0 bg-red-500 rounded-full blur-3xl opacity-40 animate-pulse" />
            <div className="absolute inset-2 bg-red-500 rounded-full blur-2xl opacity-30 animate-pulse" style={{ animationDelay: '0.2s' }} />
          </>
        )}
        <div className={`relative w-32 h-32 rounded-full flex items-center justify-center border-3 transition-all duration-300 ${
          detected ? 'border-red-500 bg-red-500/15 shadow-lg shadow-red-500/20' : 'border-accent bg-accent/5'
        }`}>
          {detected ? (
            <AlertTriangle className="w-14 h-14 text-red-400" />
          ) : (
            <div className="w-14 h-14 text-accent">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
          )}
        </div>
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-3">Flame Detection</h3>
      <p className={`text-sm font-bold tracking-wide ${detected ? 'text-red-400' : 'text-accent'}`}>
        {detected ? 'FLAME DETECTED' : 'NO FLAME'}
      </p>
    </div>
  );
}
