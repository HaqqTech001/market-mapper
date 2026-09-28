import React from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui';
import { MapPin, ShieldCheck, WifiOff } from 'lucide-react';

export const SplashScreen: React.FC = () => {
  const { navigateTo, dbReady, dbStats } = useApp();

  return (
    <div className="min-h-screen w-full bg-emerald-800 text-white flex flex-col justify-between p-6 sm:p-10 select-none">
      {/* Top Brand Marker */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-bold">
            MM
          </div>
          <span className="text-xs font-bold tracking-wider text-emerald-200 uppercase">
            Market Mapper V1
          </span>
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-emerald-100 border border-white/15">
          Local SQLite Ready
        </span>
      </div>

      {/* Hero Body */}
      <div className="max-w-md mx-auto text-center my-auto py-12">
        <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-white text-emerald-800 flex items-center justify-center shadow-xl">
          <MapPin className="w-10 h-10 text-emerald-700" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
          Market Mapper
        </h1>
        <p className="text-emerald-100/90 text-sm mt-3 leading-relaxed">
          Offline-first field data collection for informal markets, corridor footpaths, and trader inventory.
        </p>

        {/* Local Storage Indicator */}
        <div className="mt-8 p-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 text-left text-xs">
          <div className="flex items-center gap-2 font-bold text-white mb-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>SQLite Offline Engine Active</span>
          </div>
          <p className="text-emerald-100/80 text-[11px]">
            {dbReady
              ? `Embedded database initialized (${dbStats.totalTables} tables, Nigerian catalogue ready). Field mappings store locally first.`
              : 'Initializing local database schema and reference catalogue...'}
          </p>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="max-w-md mx-auto w-full space-y-3">
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={() => navigateTo('sign_in')}
          className="bg-white text-emerald-900 hover:bg-emerald-50 font-bold"
        >
          Sign In to Mission
        </Button>
        <p className="text-center text-[11px] text-emerald-200/80">
          Operates seamlessly without active cellular or internet connection
        </p>
      </div>
    </div>
  );
};
