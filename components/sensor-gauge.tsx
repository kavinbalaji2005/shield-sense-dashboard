import React from 'react';

interface SensorGaugeProps {
  label: string;
  value: number;
  max: number;
  unit: string;
  warningThreshold: number;
  criticalThreshold: number;
}

export function SensorGauge({
  label,
  value,
  max,
  unit,
  warningThreshold,
  criticalThreshold,
}: SensorGaugeProps) {
  const percentage = (value / max) * 100;
  
  let statusColor = 'text-green-400';
  let bgColor = 'from-green-500 to-green-600';
  
  if (value >= criticalThreshold) {
    statusColor = 'text-red-400';
    bgColor = 'from-red-500 to-red-600';
  } else if (value >= warningThreshold) {
    statusColor = 'text-yellow-400';
    bgColor = 'from-yellow-500 to-yellow-600';
  }

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-6">
      <div className="relative w-48 h-48">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke="rgb(51, 51, 51)"
            strokeWidth="10"
          />
          {/* Progress circle */}
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke={
              value >= criticalThreshold
                ? 'rgb(239, 68, 68)'
                : value >= warningThreshold
                  ? 'rgb(234, 179, 8)'
                  : 'rgb(74, 222, 128)'
            }
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${statusColor}`}>
            {value.toFixed(1)}
          </span>
          <span className="text-xs text-gray-500 mt-1">{unit}</span>
        </div>
      </div>
      <div className="mt-6 text-center">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">Max: {max}{unit}</p>
      </div>
    </div>
  );
}
