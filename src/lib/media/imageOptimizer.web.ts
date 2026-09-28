/**
 * Web Platform Media Fallback (Vite / AI Studio Preview / Browser Testing)
 * 
 * Uses HTML5 Canvas for offline client-side compression and thumbnailing.
 * Persists images to durable storage (localStorage / IndexedDB cache) so staged
 * images survive preview reloads and screen transitions rather than vanishing as
 * ephemeral in-memory Blobs.
 */

import { OptimizedImageResult, PhotoOptimizationOptions } from './types';

const WEB_DURABLE_STORAGE_KEY = 'mm_web_media_store';

function persistToWebDurableStorage(mediaId: string, mainDataUrl: string, thumbDataUrl: string) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storeStr = window.localStorage.getItem(WEB_DURABLE_STORAGE_KEY);
      const store = storeStr ? JSON.parse(storeStr) : {};
      store[mediaId] = {
        main: mainDataUrl,
        thumb: thumbDataUrl,
        savedAt: new Date().toISOString(),
      };
      // Keep store trimmed if large
      const keys = Object.keys(store);
      if (keys.length > 25) {
        delete store[keys[0]];
      }
      window.localStorage.setItem(WEB_DURABLE_STORAGE_KEY, JSON.stringify(store));
    }
  } catch (e) {
    console.warn('Web storage quota exceeded or unavailable', e);
  }
}

export function getWebDurableMedia(mediaId: string): { main: string; thumb: string } | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storeStr = window.localStorage.getItem(WEB_DURABLE_STORAGE_KEY);
      if (storeStr) {
        const store = JSON.parse(storeStr);
        return store[mediaId] || null;
      }
    }
  } catch {
    // Ignore
  }
  return null;
}

/**
 * Optimizes an input image file or data URI on web using HTML5 Canvas
 */
export async function optimizeAndStageWebPhoto(
  fileOrDataUrl: File | Blob | string,
  options: PhotoOptimizationOptions = {}
): Promise<OptimizedImageResult> {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.75,
    thumbnailSize = 200,
    mediaId = `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  } = options;

  return new Promise((resolve, reject) => {
    let srcUrl = '';
    let shouldRevoke = false;

    if (typeof fileOrDataUrl === 'string') {
      srcUrl = fileOrDataUrl;
    } else {
      srcUrl = URL.createObjectURL(fileOrDataUrl);
      shouldRevoke = true;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Calculate aspect-preserving dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // 1. Generate Main Optimized Image via Canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context unavailable');

        ctx.drawImage(img, 0, 0, width, height);
        const localUri = canvas.toDataURL('image/jpeg', quality);

        // Approximate byte size from base64
        const base64Length = localUri.length - (localUri.indexOf(',') + 1);
        const fileSize = Math.round((base64Length * 3) / 4);

        // 2. Generate Low-Resolution Thumbnail (thumbnailSize)
        const thumbCanvas = document.createElement('canvas');
        const thumbRatio = Math.min(thumbnailSize / width, thumbnailSize / height);
        const thumbW = Math.max(1, Math.round(width * thumbRatio));
        const thumbH = Math.max(1, Math.round(height * thumbRatio));
        thumbCanvas.width = thumbW;
        thumbCanvas.height = thumbH;
        const thumbCtx = thumbCanvas.getContext('2d');
        if (thumbCtx) {
          thumbCtx.drawImage(img, 0, 0, thumbW, thumbH);
        }
        const thumbnailUri = thumbCanvas.toDataURL('image/jpeg', 0.6);

        if (shouldRevoke) URL.revokeObjectURL(srcUrl);

        // 3. Persist to Web durable storage
        persistToWebDurableStorage(mediaId, localUri, thumbnailUri);

        resolve({
          localUri,
          thumbnailUri,
          width,
          height,
          fileSize,
          mimeType: 'image/jpeg',
          isDurable: true,
          storageType: 'web_durable',
        });
      } catch (err) {
        if (shouldRevoke) URL.revokeObjectURL(srcUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      if (shouldRevoke) URL.revokeObjectURL(srcUrl);
      reject(new Error('Failed to load image for optimization'));
    };

    img.src = srcUrl;
  });
}
