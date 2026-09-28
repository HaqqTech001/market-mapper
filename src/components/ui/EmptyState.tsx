import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl max-w-md mx-auto ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-white border border-zinc-200 text-emerald-700 flex items-center justify-center mb-3 shadow-2xs">
        {icon}
      </div>
      <h3 className="text-base font-bold text-zinc-900">{title}</h3>
      <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
