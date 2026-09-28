import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'outline' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}) => {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6',
  };

  const variantStyles = {
    default: 'bg-white border border-zinc-200/80 shadow-xs rounded-2xl',
    flat: 'bg-zinc-50 border border-zinc-100 rounded-2xl',
    outline: 'bg-transparent border border-zinc-200 rounded-2xl',
    interactive:
      'bg-white border border-zinc-200/80 shadow-xs hover:border-emerald-500/50 hover:shadow-sm transition-all cursor-pointer rounded-2xl active:scale-[0.99]',
  };

  return (
    <div
      className={`${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
