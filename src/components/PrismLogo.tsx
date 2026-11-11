import React from 'react';

export const PrismMonogram: React.FC<{ className?: string; size?: number }> = ({
  className = 'h-5 w-auto shrink-0',
  size,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 492.4 409.16"
      className={className}
      style={size ? { height: size, width: (size * 492.4) / 409.16 } : undefined}
      aria-label="Logo Prism"
      role="img"
    >
      {/* P Glyph adapting to current text color */}
      <path
        d="M205.31,0H.08s-.08,409.15-.08,409.15h89.18v-141.59h116.52s79.7-81.74,79.7-81.74l.04-104.52L205.31,0ZM167.94,183.93h-78.76v-102h78.37l27.19,27.22v44.8l-26.81,29.99Z"
        className="fill-[var(--text-primary)]"
      />
      {/* 5 Canonical Spectral Bands: Cyan -> Olive -> Yellow -> Orange -> Magenta */}
      <g>
        <polygon
          points="223.02 0 297.4 74.85 297.37 81.78 492.4 81.78 492.4 0 223.02 0"
          fill="#01ABE8"
        />
        <polygon
          points="297.01 163.32 492.4 163.32 492.4 81.78 297.37 81.78 297.01 163.32"
          fill="#AEB932"
        />
        <polygon
          points="296.89 190.02 297.37 190.05 242.14 245.1 492.4 245.1 492.4 163.57 492.4 163.32 297.01 163.32 296.89 190.02"
          fill="#F4E412"
        />
        <polygon
          points="209.34 277.91 102.9 277.91 102.9 327.13 492.4 327.13 492.4 245.35 241.9 245.35 209.34 277.8 209.34 277.91"
          fill="#E97635"
        />
        <rect x="102.9" y="327.38" width="389.49" height="81.78" fill="#DA0082" />
      </g>
    </svg>
  );
};

export const PrismSpectralBar: React.FC<{ className?: string }> = ({
  className = 'h-0.5 w-full',
}) => {
  return (
    <div className={`flex overflow-hidden ${className}`} aria-hidden="true">
      <div className="flex-1 bg-[#01ABE8]" />
      <div className="flex-1 bg-[#AEB932]" />
      <div className="flex-1 bg-[#F4E412]" />
      <div className="flex-1 bg-[#E97635]" />
      <div className="flex-1 bg-[#DA0082]" />
    </div>
  );
};

