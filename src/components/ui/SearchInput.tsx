import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search goods, services, places...',
  className = '',
  ...props
}) => {
  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <div className="absolute left-3.5 text-zinc-400 pointer-events-none flex items-center justify-center">
        <Search className="w-4 h-4" />
      </div>

      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full min-h-[44px] pl-10 pr-10 py-2.5 text-sm font-medium text-zinc-900 bg-white border border-zinc-200 rounded-xl placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-600 shadow-2xs transition-all"
        {...props}
      />

      {value && String(value).length > 0 && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2.5 p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg transition-colors cursor-pointer"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
