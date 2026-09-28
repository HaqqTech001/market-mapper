/**
 * Market Mapper — Daylight Field Palette Tokens
 * Centralized theme tokens optimized for outdoor readability under direct African sunlight.
 * High contrast, non-glare surfaces, dark typography, strong geometric borders.
 */

export const DAYLIGHT_THEME = {
  surfaces: {
    base: 'bg-zinc-50',
    card: 'bg-white',
    cardMuted: 'bg-zinc-100',
    cardTintedEmerald: 'bg-emerald-50/80',
    cardTintedAmber: 'bg-amber-50/80',
    cardTintedBlue: 'bg-blue-50/80',
    modal: 'bg-white',
    sheet: 'bg-white',
    hud: 'bg-white/95 backdrop-blur-md',
  },
  borders: {
    subtle: 'border-zinc-200',
    standard: 'border-zinc-300',
    strong: 'border-zinc-400',
    emerald: 'border-emerald-600',
    amber: 'border-amber-600',
    focusRing: 'ring-2 ring-emerald-600',
  },
  text: {
    primary: 'text-zinc-900',
    secondary: 'text-zinc-700',
    muted: 'text-zinc-500',
    inverted: 'text-white',
    emerald: 'text-emerald-800',
    amber: 'text-amber-900',
    red: 'text-red-700',
  },
  interactive: {
    primary: 'bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold',
    secondary: 'bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-900 font-semibold border border-zinc-300',
    outline: 'bg-white hover:bg-zinc-50 active:bg-zinc-100 text-zinc-900 font-bold border-2 border-zinc-300',
    danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold',
    accent: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold',
  },
  targets: {
    fieldTouchMin: 'min-h-[48px] min-w-[48px]',
    primaryCta: 'min-h-[50px]',
  },
  mapVisuals: {
    pathRecordedHalo: '#ffffff',
    pathRecordedCore: '#0f172a', // High-contrast navy/black
    pathActiveCore: '#059669', // Pulsing emerald
    junctionNodeFill: '#d97706', // Strong amber
    junctionNodeBorder: '#78350f', // Dark amber stroke
    junctionSelectedRing: '#2563eb', // Blue selection
    businessPinStall: '#059669',
    businessPinService: '#7c3aed',
    gateMarker: '#4f46e5',
    issueMarker: '#dc2626',
  },
};
