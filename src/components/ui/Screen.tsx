import React from 'react';

export interface ScreenProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  scrollable?: boolean;
  className?: string;
  contentClassName?: string;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  header,
  footer,
  scrollable = true,
  className = '',
  contentClassName = '',
}) => {
  return (
    <div className={`flex flex-col min-h-full w-full bg-slate-50 text-zinc-900 ${className}`}>
      {header}

      {scrollable ? (
        <main className={`grow overflow-y-auto p-4 sm:p-6 max-w-7xl w-full mx-auto pb-24 sm:pb-8 ${contentClassName}`}>
          {children}
        </main>
      ) : (
        <main className={`grow relative overflow-hidden flex flex-col w-full ${contentClassName}`}>
          {children}
        </main>
      )}

      {footer}
    </div>
  );
};
