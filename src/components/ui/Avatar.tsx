import React from 'react';

export interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  status?: 'online' | 'offline' | 'busy';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  size = 'md',
  status,
  className = '',
}) => {
  const sizeStyles = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg font-bold',
  };

  const statusIndicatorStyles = {
    online: 'bg-emerald-500',
    offline: 'bg-zinc-400',
    busy: 'bg-amber-500',
  };

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizeStyles[size]} rounded-full object-cover border border-zinc-200 shadow-2xs`}
        />
      ) : (
        <div
          className={`${sizeStyles[size]} rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center border border-emerald-800 shadow-2xs`}
        >
          {initials || 'MM'}
        </div>
      )}

      {status && (
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${statusIndicatorStyles[status]}`}
        />
      )}
    </div>
  );
};
