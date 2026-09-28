/**
 * Centralized Adaptive Layout & Capability Hook
 * 
 * Avoids rigid hardcoded breakpoints scattered across components.
 * Considers available viewport width, height, aspect ratio, orientation, and
 * constrained tablet split-screen or multi-window conditions.
 */

import { useState, useEffect } from 'react';

export interface ResponsiveState {
  width: number;
  height: number;
  isPortrait: boolean;
  isLandscape: boolean;
  /** True when space is constrained (< 680px or narrow split-screen), requiring compact stack layout */
  isCompactLayout: boolean;
  /** True when sufficient width is available (>= 680px) for sidebar or master-detail navigation */
  isExpandedLayout: boolean;
  /** True when width is spacious enough (>= 960px) for dual-pane map + side inspector panel */
  supportsSplitView: boolean;
}

export function useResponsive(overrideMode?: 'auto' | 'phone' | 'tablet'): ResponsiveState {
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const effectiveWidth =
    overrideMode === 'phone'
      ? 390
      : overrideMode === 'tablet'
      ? 1024
      : dimensions.width;

  const isPortrait = dimensions.height > dimensions.width;
  const isLandscape = !isPortrait;

  // Adaptive capabilities based on actual rendering space
  // A tablet in constrained split-view (e.g. 1/3 screen) drops to compact layout
  const isCompactLayout = effectiveWidth < 720;
  const isExpandedLayout = effectiveWidth >= 720;
  const supportsSplitView = effectiveWidth >= 960;

  return {
    width: effectiveWidth,
    height: dimensions.height,
    isPortrait,
    isLandscape,
    isCompactLayout,
    isExpandedLayout,
    supportsSplitView,
  };
}
