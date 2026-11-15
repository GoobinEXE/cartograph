import React from 'react';

export const PrismMonogram: React.FC<{ className?: string; size?: number }> = ({
  className = 'h-6 w-auto shrink-0',
  size,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="56 96 432 348"
      fill="none"
      className={className}
      style={size ? { height: size, width: (size * 432) / 348 } : undefined}
      aria-label="Logo Cartograph"
      role="img"
    >
      {/* 5 Faixas Espectrais Prism (recortadas em arco exato) */}
      <path
        d="M 327.52 101.00 L 484 101.00 L 484 157.60 L 391.65 157.60 A 155 155 0 0 0 327.52 101.00 Z"
        fill="#01ABE8"
      />
      <path
        d="M 391.27 157.00 L 484 157.00 L 484 213.60 L 413.56 213.60 A 155 155 0 0 0 391.27 157.00 Z"
        fill="#AEB932"
      />
      <path
        d="M 413.45 213.00 L 484 213.00 L 484 269.60 L 413.34 269.60 A 155 155 0 0 0 413.45 213.00 Z"
        fill="#F4E412"
      />
      <path
        d="M 413.45 269.00 L 484 269.00 L 484 325.60 L 390.88 325.60 A 155 155 0 0 0 413.45 269.00 Z"
        fill="#E97635"
      />
      <path
        d="M 391.27 325.00 L 484 325.00 L 484 381.00 L 327.52 381.00 A 155 155 0 0 0 391.27 325.00 Z"
        fill="#DA0082"
      />

      {/* Lupa Unificada adaptável ao tema claro/escuro */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M 146.96 323.92 A 141 141 0 1 1 178.08 355.04 L 95.54 437.58 A 22 22 0 0 1 64.42 406.46 Z M 156.00 241.00 A 105 105 0 1 0 366.00 241.00 A 105 105 0 1 0 156.00 241.00 Z"
        className="fill-[var(--text-primary)]"
      />

      {/* Agulha Cartográfica Unificada */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M 323.23 178.77 L 284.33 264.33 L 198.77 303.23 L 237.67 217.67 Z M 242.59 234.61 L 221.93 280.07 L 267.39 259.41 Z"
        className="fill-[var(--text-primary)]"
      />
    </svg>
  );
};

export const PrismPMonogram: React.FC<{ className?: string; size?: number }> = ({
  className = 'h-5 w-auto shrink-0',
  size,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 492.4 409.16"
      fill="none"
      className={className}
      style={size ? { height: size, width: (size * 492.4) / 409.16 } : undefined}
      aria-label="Logo Prism"
      role="img"
    >
      {/* Glifo P adaptável ao tema claro/escuro */}
      <path
        d="M205.31,0H.08s-.08,409.15-.08,409.15h89.18v-141.59h116.52s79.7-81.74,79.7-81.74l.04-104.52L205.31,0ZM167.94,183.93h-78.76v-102h78.37l27.19,27.22v44.8l-26.81,29.99Z"
        className="fill-[var(--text-primary)]"
      />
      {/* 5 Faixas Espectrais Canônicas da Prism: Ciano -> Oliva -> Amarelo -> Laranja -> Magenta */}
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

