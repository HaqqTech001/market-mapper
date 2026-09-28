import React from 'react';
import { JunctionType } from '../../types';

export interface JunctionSchematicProps {
  type: JunctionType;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isSelected?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: { outer: 'w-8 h-8', stroke: 6, dot: 4 },
  md: { outer: 'w-12 h-12', stroke: 7, dot: 5 },
  lg: { outer: 'w-16 h-16', stroke: 8, dot: 6 },
  xl: { outer: 'w-20 h-20', stroke: 9, dot: 7 },
};

/**
 * High-contrast, outdoor-visible geometric junction schematic.
 * Built specifically for direct sunlight legibility on light/daylight surfaces.
 */
export const JunctionSchematic: React.FC<JunctionSchematicProps> = ({
  type,
  size = 'md',
  isSelected = false,
  className = '',
}) => {
  const { outer, stroke, dot } = SIZE_MAP[size];
  const strokeColor = isSelected ? '#047857' : '#09090b'; // Deep emerald or deep black
  const centerFill = isSelected ? '#10b981' : '#d97706'; // Vibrant dot

  const renderGeometry = () => {
    switch (type) {
      case 't_junction':
        return (
          <>
            {/* Top crossbar */}
            <line
              x1="10"
              y1="18"
              x2="54"
              y2="18"
              stroke={strokeColor}
              strokeWidth={stroke}
              strokeLinecap="round"
            />
            {/* Perpendicular stem */}
            <line
              x1="32"
              y1="18"
              x2="32"
              y2="54"
              stroke={strokeColor}
              strokeWidth={stroke}
              strokeLinecap="round"
            />
            {/* Center node indicator */}
            <circle cx="32" cy="18" r={dot} fill={centerFill} />
          </>
        );

      case 'cross_4way':
        return (
          <>
            {/* Horizontal street */}
            <line
              x1="10"
              y1="32"
              x2="54"
              y2="32"
              stroke={strokeColor}
              strokeWidth={stroke}
              strokeLinecap="round"
            />
            {/* Vertical street */}
            <line
              x1="32"
              y1="10"
              x2="32"
              y2="54"
              stroke={strokeColor}
              strokeWidth={stroke}
              strokeLinecap="round"
            />
            {/* Center junction node */}
            <circle cx="32" cy="32" r={dot} fill={centerFill} />
          </>
        );

      case 'y_fork':
        return (
          <>
            {/* Base corridor */}
            <line
              x1="32"
              y1="54"
              x2="32"
              y2="34"
              stroke={strokeColor}
              strokeWidth={stroke}
              strokeLinecap="round"
            />
            {/* Left branch */}
            <line
              x1="32"
              y1="34"
              x2="14"
              y2="14"
              stroke={strokeColor}
              strokeWidth={stroke}
              strokeLinecap="round"
            />
            {/* Right branch */}
            <line
              x1="32"
              y1="34"
              x2="50"
              y2="14"
              stroke={strokeColor}
              strokeWidth={stroke}
              strokeLinecap="round"
            />
            <circle cx="32" cy="34" r={dot} fill={centerFill} />
          </>
        );

      case 'irregular_3way':
        return (
          <>
            {/* Main diagonal path */}
            <line
              x1="14"
              y1="52"
              x2="50"
              y2="12"
              stroke={strokeColor}
              strokeWidth={stroke}
              strokeLinecap="round"
            />
            {/* Offset side alley */}
            <line
              x1="32"
              y1="32"
              x2="54"
              y2="44"
              stroke={strokeColor}
              strokeWidth={stroke}
              strokeLinecap="round"
            />
            <circle cx="32" cy="32" r={dot} fill={centerFill} />
          </>
        );

      case 'multi_way':
        return (
          <>
            {/* 5 radial spoke branches radiating outward from center */}
            <line x1="32" y1="32" x2="32" y2="10" stroke={strokeColor} strokeWidth={stroke - 1.5} strokeLinecap="round" />
            <line x1="32" y1="32" x2="54" y2="22" stroke={strokeColor} strokeWidth={stroke - 1.5} strokeLinecap="round" />
            <line x1="32" y1="32" x2="48" y2="52" stroke={strokeColor} strokeWidth={stroke - 1.5} strokeLinecap="round" />
            <line x1="32" y1="32" x2="16" y2="52" stroke={strokeColor} strokeWidth={stroke - 1.5} strokeLinecap="round" />
            <line x1="32" y1="32" x2="10" y2="22" stroke={strokeColor} strokeWidth={stroke - 1.5} strokeLinecap="round" />
            <circle cx="32" cy="32" r={dot + 1} fill={centerFill} />
          </>
        );

      case 'corner_bend':
        return (
          <>
            {/* 90-degree corner path */}
            <path
              d="M 16 12 L 16 46 L 52 46"
              fill="none"
              stroke={strokeColor}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="16" cy="46" r={dot} fill={centerFill} />
          </>
        );

      case 'dead_end':
        return (
          <>
            {/* Approaching corridor */}
            <line
              x1="32"
              y1="54"
              x2="32"
              y2="24"
              stroke={strokeColor}
              strokeWidth={stroke}
              strokeLinecap="round"
            />
            {/* Solid barrier stop bar */}
            <line
              x1="14"
              y1="18"
              x2="50"
              y2="18"
              stroke="#dc2626"
              strokeWidth={stroke + 2}
              strokeLinecap="square"
            />
            <circle cx="32" cy="24" r={dot} fill="#dc2626" />
          </>
        );

      case 'unknown':
      default:
        return (
          <>
            {/* Dotted perimeter */}
            <circle
              cx="32"
              cy="32"
              r="22"
              fill="none"
              stroke={strokeColor}
              strokeWidth="4"
              strokeDasharray="6 4"
            />
            {/* Bold centered question mark */}
            <text
              x="32"
              y="42"
              textAnchor="middle"
              fontSize="30"
              fontWeight="900"
              fontFamily="monospace"
              fill={strokeColor}
            >
              ?
            </text>
          </>
        );
    }
  };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl transition-all select-none ${outer} ${
        isSelected
          ? 'bg-emerald-100/90 border-2 border-emerald-600'
          : 'bg-zinc-100 border-2 border-zinc-300'
      } ${className}`}
      aria-label={`Junction schematic for ${type}`}
    >
      <svg
        viewBox="0 0 64 64"
        className="w-full h-full p-1 drop-shadow-xs"
        xmlns="http://www.w3.org/2000/svg"
      >
        {renderGeometry()}
      </svg>
    </div>
  );
};
