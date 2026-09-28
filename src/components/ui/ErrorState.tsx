import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-6 bg-red-50/70 border border-red-200 rounded-2xl text-center max-w-md mx-auto ${className}`}
    >
      <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-2.5">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-bold text-red-950">{title}</h3>
      <p className="text-xs text-red-800/90 mt-1 max-w-xs">{message}</p>
      {onRetry && (
        <div className="mt-3.5">
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
};
