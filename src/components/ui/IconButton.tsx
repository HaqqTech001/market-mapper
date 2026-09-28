import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string; // Accessible aria-label
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  badge?: number | string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  badge,
  className = '',
  disabled,
  ...props
}) => {
  const sizeStyles = {
    sm: 'w-9 h-9 min-w-[36px] min-h-[36px] text-xs',
    md: 'w-11 h-11 min-w-[44px] min-h-[44px] text-sm', // 44px min touch target
    lg: 'w-13 h-13 min-w-[52px] min-h-[52px] text-base',
  };

  const variantStyles = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs',
    secondary: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200',
    outline: 'bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200',
    ghost: 'bg-transparent hover:bg-zinc-100 text-zinc-700',
    danger: 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200',
  };

  return (
    <button
      aria-label={label}
      title={label}
      disabled={disabled}
      className={`relative inline-flex items-center justify-center rounded-xl transition-colors cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-40 disabled:cursor-not-allowed ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {icon}
      {badge !== undefined && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs">
          {badge}
        </span>
      )}
    </button>
  );
};
