import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  leadingIcon,
  trailingIcon,
  disabled,
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-colors cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeStyles = {
    sm: 'min-h-[38px] px-3.5 py-1.5 text-xs gap-1.5',
    md: 'min-h-[44px] px-5 py-2.5 text-sm gap-2', // Meets 44px min touch target
    lg: 'min-h-[50px] px-6 py-3 text-base gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:bg-emerald-800',
    secondary: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 active:bg-emerald-200',
    outline: 'bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 active:bg-zinc-100',
    ghost: 'bg-transparent hover:bg-zinc-100 text-zinc-700 active:bg-zinc-200',
    danger: 'bg-red-600 hover:bg-red-700 text-white active:bg-red-800',
    accent: 'bg-orange-600 hover:bg-orange-700 text-white active:bg-orange-800',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyle} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : leadingIcon ? (
        <span className="shrink-0">{leadingIcon}</span>
      ) : null}
      <span className="truncate">{children}</span>
      {!isLoading && trailingIcon ? <span className="shrink-0">{trailingIcon}</span> : null}
    </button>
  );
};
