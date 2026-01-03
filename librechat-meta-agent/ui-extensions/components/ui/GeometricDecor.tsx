'use client';

import React from 'react';

interface GeometricDecorProps {
  variant?: 'radial' | 'grid' | 'dots' | 'lines';
  size?: 'sm' | 'md' | 'lg';
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity?: number;
  color?: string;
  className?: string;
}

export function GeometricDecor({
  variant = 'radial',
  size = 'md',
  position = 'bottom-left',
  opacity = 0.4,
  color = '#d6d3d1', // warm-300
  className = '',
}: GeometricDecorProps) {
  const sizeMap = {
    sm: 200,
    md: 300,
    lg: 400,
  };

  const positionClasses = {
    'top-left': 'top-0 left-0',
    'top-right': 'top-0 right-0',
    'bottom-left': 'bottom-0 left-0',
    'bottom-right': 'bottom-0 right-0',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  };

  const dimension = sizeMap[size];

  // Radial lines (like reference image)
  if (variant === 'radial') {
    const lines = 60;
    return (
      <div
        className={`absolute pointer-events-none ${positionClasses[position]} ${className}`}
        style={{ opacity }}
      >
        <svg
          width={dimension}
          height={dimension}
          viewBox={`0 0 ${dimension} ${dimension}`}
          className="overflow-visible"
        >
          <g transform={`translate(${dimension / 2}, ${dimension / 2})`}>
            {Array.from({ length: lines }).map((_, i) => {
              const angle = (i * 360) / lines;
              const innerRadius = dimension * 0.2;
              const outerRadius = dimension * 0.5;
              const x1 = innerRadius * Math.cos((angle * Math.PI) / 180);
              const y1 = innerRadius * Math.sin((angle * Math.PI) / 180);
              const x2 = outerRadius * Math.cos((angle * Math.PI) / 180);
              const y2 = outerRadius * Math.sin((angle * Math.PI) / 180);

              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={color}
                  strokeWidth="1"
                />
              );
            })}
          </g>
        </svg>
      </div>
    );
  }

  // Grid pattern
  if (variant === 'grid') {
    const gridSize = 20;
    return (
      <div
        className={`absolute pointer-events-none ${positionClasses[position]} ${className}`}
        style={{ opacity }}
      >
        <svg width={dimension} height={dimension}>
          <defs>
            <pattern
              id="grid"
              width={gridSize}
              height={gridSize}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                fill="none"
                stroke={color}
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
    );
  }

  // Dots pattern
  if (variant === 'dots') {
    const dotSpacing = 24;
    const dotRadius = 2;
    const cols = Math.floor(dimension / dotSpacing);
    const rows = Math.floor(dimension / dotSpacing);

    return (
      <div
        className={`absolute pointer-events-none ${positionClasses[position]} ${className}`}
        style={{ opacity }}
      >
        <svg width={dimension} height={dimension}>
          {Array.from({ length: rows }).map((_, row) =>
            Array.from({ length: cols }).map((_, col) => (
              <circle
                key={`${row}-${col}`}
                cx={col * dotSpacing + dotSpacing / 2}
                cy={row * dotSpacing + dotSpacing / 2}
                r={dotRadius}
                fill={color}
              />
            ))
          )}
        </svg>
      </div>
    );
  }

  // Horizontal lines
  if (variant === 'lines') {
    const lineSpacing = 8;
    const lineCount = Math.floor(dimension / lineSpacing);

    return (
      <div
        className={`absolute pointer-events-none ${positionClasses[position]} ${className}`}
        style={{ opacity }}
      >
        <svg width={dimension} height={dimension}>
          {Array.from({ length: lineCount }).map((_, i) => (
            <line
              key={i}
              x1="0"
              y1={i * lineSpacing}
              x2={dimension}
              y2={i * lineSpacing}
              stroke={color}
              strokeWidth="1"
            />
          ))}
        </svg>
      </div>
    );
  }

  return null;
}

export default GeometricDecor;
