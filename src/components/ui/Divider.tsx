import React from 'react';

export interface DividerProps {
  label?: string;
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({ label, className = '' }) => {
  if (!label) {
    return <hr className={`border-t border-zinc-200 w-full my-4 ${className}`} />;
  }

  return (
    <div className={`relative flex items-center my-4 w-full ${className}`}>
      <div className="grow border-t border-zinc-200" />
      <span className="shrink-0 mx-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        {label}
      </span>
      <div className="grow border-t border-zinc-200" />
    </div>
  );
};
