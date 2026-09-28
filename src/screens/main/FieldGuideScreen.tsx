import React from 'react';
import { useApp } from '../../context/AppContext';
import { Header, Card, Badge } from '../../components/ui';
import {
  BookOpen,
  MapPin,
  Navigation,
  Camera,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const FieldGuideScreen: React.FC = () => {
  const {
    isOffline,
    toggleOffline,
    syncStatus,
    pendingSyncCount,
    unreadNotifsCount,
    goBack,
  } = useApp();

  return (
    <div className="flex flex-col grow">
      <Header
        title="Field Guide & Standards"
        subtitle="Operational protocol for informal markets"
        showBack
        onBack={goBack}
        isOffline={isOffline}
        onToggleOffline={toggleOffline}
        syncStatus={syncStatus}
        pendingSyncCount={pendingSyncCount}
        unreadNotifsCount={unreadNotifsCount}
      />

      <div className="p-4 sm:p-6 max-w-4xl w-full mx-auto space-y-5 grow">
        {/* Section 1: Stall Naming & Visibility */}
        <Card padding="lg">
          <div className="flex items-center gap-2.5 text-emerald-800 font-bold text-sm mb-3">
            <MapPin className="w-5 h-5 text-emerald-700" />
            <span>1. Stall Naming & Identifiers</span>
          </div>

          <div className="space-y-3 text-xs text-zinc-700 leading-relaxed">
            <p>
              In Nigerian markets (such as Alaba, Balogun, Ariaria, and Wuse), many stalls do not display formal commercial company signboards. Follow these precedence rules:
            </p>

            <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200/80 space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Signboard Present:</strong> Enter the exact text shown on the storefront banner or painted board (e.g. &apos;Solatronics Pure Sine Wave&apos;).
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>No Signboard / Operational Label:</strong> Check the &apos;No visible signboard&apos; checkbox. The system will derive an operational label from Line and Stall number (e.g. &apos;Line B, Shop 42&apos;).
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Trader Nickname / Alias:</strong> You may record known trader names in notes or aliases (e.g. &apos;Mama Emeka Tabletop&apos;).
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Section 2: Structure Stability Classification */}
        <Card padding="lg">
          <div className="flex items-center gap-2.5 text-emerald-800 font-bold text-sm mb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <span>2. Structure Stability Classification</span>
          </div>

          <p className="text-xs text-zinc-600 mb-3">
            Accurately classify the physical permanence of the stall to assist spatial planning:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
              <strong className="text-zinc-900 block font-bold">Permanent Shop / Lockup</strong>
              <p className="text-zinc-500 text-[11px] mt-1">
                Concrete blockwork, iron-roller shutter, or dedicated plaza room. Highest locational permanence.
              </p>
            </div>
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
              <strong className="text-zinc-900 block font-bold">Kiosk / Shipping Container</strong>
              <p className="text-zinc-500 text-[11px] mt-1">
                Repurposed steel shipping containers, fabricated wooden or zinc kiosks placed along corridors.
              </p>
            </div>
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
              <strong className="text-zinc-900 block font-bold">Tabletop / Open Stall</strong>
              <p className="text-zinc-500 text-[11px] mt-1">
                Wooden tables, umbrella-shaded platforms, or spread tarpaulins. Moderate mobility.
              </p>
            </div>
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
              <strong className="text-zinc-900 block font-bold">Ambulant / Hawker / Cart</strong>
              <p className="text-zinc-500 text-[11px] mt-1">
                Wheelbarrow, push-cart, or mobile walking vendors. High mobility within market boundaries.
              </p>
            </div>
          </div>
        </Card>

        {/* Section 3: Corridor Paths & Junctions */}
        <Card padding="lg">
          <div className="flex items-center gap-2.5 text-emerald-800 font-bold text-sm mb-3">
            <Navigation className="w-5 h-5 text-emerald-700" />
            <span>3. Corridor Footpath Recording</span>
          </div>

          <div className="space-y-2 text-xs text-zinc-700 leading-relaxed">
            <p>
              When recording market alleyways, keep the following baseline rules in mind:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-600">
              <li>Walk along the center of the walkway at a steady pace.</li>
              <li>Always mark a <strong>Junction</strong> whenever a corridor branches into a side alley, cross-lane, or market gate.</li>
              <li>Under dense metal/zinc roofing, GPS accuracy may drop. Do NOT panic; Market Mapper preserves raw GPS samples in local SQLite and allows checkpoint verification.</li>
            </ul>
          </div>
        </Card>

        {/* Section 4: Photo Consent Protocol */}
        <Card padding="lg">
          <div className="flex items-center gap-2.5 text-emerald-800 font-bold text-sm mb-3">
            <Camera className="w-5 h-5 text-emerald-700" />
            <span>4. Photo Etiquette & Consent</span>
          </div>

          <div className="space-y-3 text-xs text-zinc-700 leading-relaxed">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-950">
              <strong className="block font-bold">Golden Rule:</strong>
              Never photograph a trader or stall without explicit verbal consent. Introduce yourself as part of the Market Mapping survey team.
            </div>

            <p>
              If a trader expresses reluctance or declines:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-600">
              <li>Respect their decision immediately. Do not debate or pressure them.</li>
              <li>Check <strong>Photo Declined</strong> in the capture form.</li>
              <li>Proceed with recording the goods, services, and GPS coordinates without penalty.</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
};
