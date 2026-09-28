/**
 * Unified Media Optimizer & Staging Dispatcher (Phase 4 Media Pipeline)
 * 
 * Clean Platform Abstraction:
 * - Native Android/iOS: Uses imageOptimizer.native.ts (expo-file-system + expo-image-manipulator, NO HTML5 Canvas)
 * - Web/Vite Preview: Uses imageOptimizer.web.ts (HTML5 Canvas + durable storage fallback)
 */

export * from './types';
import { OptimizedImageResult, PhotoOptimizationOptions } from './types';
import { isNativeMediaPipelineAvailable, optimizeAndStageNativePhoto } from './imageOptimizer.native';
import { optimizeAndStageWebPhoto } from './imageOptimizer.web';

/**
 * Optimizes an input image file or URI, persisting it durably to app storage
 * (documentDirectory on native, persistent store on web).
 */
export async function optimizeStorefrontPhoto(
  fileOrUri: File | Blob | string,
  maxWidthOrOptions: number | PhotoOptimizationOptions = 1280,
  maxHeight = 1280,
  quality = 0.75,
  options: PhotoOptimizationOptions = {}
): Promise<OptimizedImageResult> {
  let mergedOptions: PhotoOptimizationOptions;

  if (typeof maxWidthOrOptions === 'object' && maxWidthOrOptions !== null) {
    mergedOptions = {
      maxWidth: 1280,
      maxHeight: 1280,
      quality: 0.75,
      ...maxWidthOrOptions,
    };
  } else {
    mergedOptions = {
      maxWidth: typeof maxWidthOrOptions === 'number' ? maxWidthOrOptions : 1280,
      maxHeight,
      quality,
      ...options,
    };
  }

  // 1. Production Native Expo Pipeline (No Canvas)
  if (isNativeMediaPipelineAvailable() && typeof fileOrUri === 'string') {
    return await optimizeAndStageNativePhoto(fileOrUri, mergedOptions);
  }

  // 2. Web / AI Studio Preview Fallback (Isomorphic Canvas + Storage)
  return await optimizeAndStageWebPhoto(fileOrUri, mergedOptions);
}

/**
 * Explicit helper to stage a photo with durable guarantees
 */
export async function stageStorefrontPhotoDurable(
  fileOrUri: File | Blob | string,
  options: PhotoOptimizationOptions = {}
): Promise<OptimizedImageResult> {
  return optimizeStorefrontPhoto(fileOrUri, options);
}
