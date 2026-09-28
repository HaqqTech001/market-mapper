import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  optional?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, leadingIcon, trailingIcon, optional, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <div className="flex items-center justify-between">
            <label htmlFor={inputId} className="text-xs font-bold text-zinc-800 tracking-wide">
              {label}
            </label>
            {optional && <span className="text-[11px] font-medium text-zinc-400">Optional</span>}
          </div>
        )}

        <div className="relative flex items-center">
          {leadingIcon && (
            <div className="absolute left-3.5 text-zinc-400 pointer-events-none flex items-center justify-center">
              {leadingIcon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            className={`w-full min-h-[44px] px-3.5 py-2.5 text-sm font-medium text-zinc-900 bg-white border rounded-xl placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${
              leadingIcon ? 'pl-10' : ''
            } ${trailingIcon ? 'pr-10' : ''} ${
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                : 'border-zinc-300 focus:border-emerald-600'
            } ${className}`}
            {...props}
          />

          {trailingIcon && (
            <div className="absolute right-3.5 text-zinc-400 flex items-center justify-center">
              {trailingIcon}
            </div>
          )}
        </div>

        {error ? (
          <p className="text-xs font-semibold text-red-600 mt-0.5">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-zinc-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
