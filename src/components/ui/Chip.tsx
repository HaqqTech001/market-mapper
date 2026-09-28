import React from 'react';

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  selected?: boolean;
  count?: number;
  leadingIcon?: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  count,
  leadingIcon,
  className = '',
  ...props
}) => {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-semibold select-none cursor-pointer transition-all ${
        selected
          ? 'bg-emerald-600 text-white shadow-2xs'
          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 active:bg-zinc-300'
      } ${className}`}
      {...props}
    >
      {leadingIcon && <span className="shrink-0">{leadingIcon}</span>}
      <span className="whitespace-nowrap">{label}</span>
      {count !== undefined && (
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            selected ? 'bg-emerald-700/60 text-white' : 'bg-zinc-200 text-zinc-600'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
};
