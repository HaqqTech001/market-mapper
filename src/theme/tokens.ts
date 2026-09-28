/**
 * Market Mapper Field Design Tokens
 * 
 * Aesthetic Direction:
 * - Green/white field identity
 * - Restrained orange accent
 * - High outdoor readability (WCAG AAA contrast for field operation)
 * - Large touch targets (min 44px)
 * - Clear, utilitarian typographic hierarchy
 */

export const colors = {
  primary: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669', // Brand Primary
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  accent: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c', // Restrained Orange Accent
    700: '#c2410c',
    800: '#9a3412',
  },
  neutral: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#09090b',
  },
  status: {
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
    info: '#2563eb',
  },
  surface: {
    canvas: '#f8fafc',
    card: '#ffffff',
    elevated: '#ffffff',
    fieldOutdoor: '#f1f5f9',
  },
} as const;

/**
 * Outdoor-First Field Theme Design Tokens (Requirement 25)
 * Optimized for direct sunlight, high glare, and rapid one-handed field mapping.
 */
export const fieldTokens = {
  background: '#f1f5f9', // Slate-100 high-clarity canvas
  surface: '#ffffff',    // Crisp white for cards and floating panels
  surfaceSubtle: '#f8fafc', // Slate-50 for secondary panels
  surfaceMuted: '#e2e8f0',  // Slate-200 for pressed/inactive states
  textPrimary: '#0f172a',  // Slate-900 WCAG AAA contrast
  textSecondary: '#334155', // Slate-700
  textMuted: '#64748b',     // Slate-500
  border: '#cbd5e1',        // Slate-300 high-definition border
  borderStrong: '#94a3b8',  // Slate-400 for focused/active outlines
  borderActive: '#059669',  // Emerald-600

  // Coherent Map Object Language Tokens
  map: {
    canvasDefault: '#e2e8f0',    // Daylight slate vector basemap
    gridStroke: '#cbd5e1',       // Subtle coordinate grid
    userLocation: '#2563eb',     // Blue-600 vivid GPS locator
    userAccuracyHalo: 'rgba(37, 99, 235, 0.15)',
    pathActive: '#ea580c',       // Vivid orange for active corridor
    pathActiveShadow: 'rgba(234, 88, 12, 0.25)',
    pathSaved: '#059669',        // Deep emerald for saved corridors
    business: '#047857',         // Forest green marker
    revisit: '#dc2626',          // Red/amber alert marker
    junction: '#d97706',         // Amber node
    gate: '#4338ca',             // Indigo gateway
    areaAssigned: 'rgba(59, 130, 246, 0.08)',
    areaAssignedStroke: '#2563eb',
    marketBoundary: 'rgba(5, 150, 105, 0.06)',
    marketBoundaryStroke: '#059669',
    selectedHighlight: '#06b6d4', // Cyan focus ring
  },

  // Field Status Badges
  status: {
    online: '#059669',
    offline: '#ea580c',
    warning: '#d97706',
    error: '#dc2626',
    info: '#2563eb',
    recording: '#e11d48',
    paused: '#d97706',
  },

  touch: {
    minTargetSize: 44, // 44px minimum touch target for field operation
    standardButtonHeight: 48,
    largeButtonHeight: 54,
  },
} as const;

export const dimensions = {
  minTouchTarget: 44, // px
  headerHeight: 56, // px
  bottomNavHeight: 64, // px
  tabletSidebarWidth: 280, // px
} as const;
