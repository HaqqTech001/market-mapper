/**
 * Media Pipeline Domain Types (Phase 4 Media Staging)
 * Separates native mobile pipeline contracts from web preview fallback.
 */

export type PhotoCaptureState = 'captured' | 'declined' | 'not_captured' | 'unable';

export interface OptimizedImageResult {
  localUri: string; // Durable native file:// URI or durable web storage URI
  thumbnailUri: string;
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
  isDurable: boolean;
  storageType: 'native_fs' | 'web_durable';
}

export interface PhotoOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  thumbnailSize?: number;
  mediaId?: string;
  entityId?: string;
}
