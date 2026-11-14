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

