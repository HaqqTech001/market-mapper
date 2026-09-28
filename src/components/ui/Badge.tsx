import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'accent';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  icon,
  className = '',
}) => {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px] font-semibold gap-1',
    md: 'px-2.5 py-1 text-xs font-semibold gap-1.5',
  };

  const variantStyles = {
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200/80',
    error: 'bg-red-50 text-red-800 border border-red-200/80',
    info: 'bg-blue-50 text-blue-800 border border-blue-200/80',
    neutral: 'bg-zinc-100 text-zinc-700 border border-zinc-200/60',
    accent: 'bg-orange-50 text-orange-800 border border-orange-200/80',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full uppercase tracking-wider select-none shrink-0 ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {icon}
      <span>{children}</span>
    </span>
  );
};
