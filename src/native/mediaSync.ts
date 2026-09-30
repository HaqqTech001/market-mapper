import * as FileSystem from 'expo-file-system';
import { nativeSupabase } from './supabase';
import { MediaUploadRepository } from '@/src/db/repositories/MediaUploadRepository';
import { getDatabase } from '@/src/db/sqlite';
import type { MediaUploadQueueItem } from '@/src/types';

function contentTypeFor(item: MediaUploadQueueItem) {
  const ext = item.localUri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  return 'image/jpeg';
}

async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let buffer = 0, bits = 0;
  const bytes: number[] = [];
  for (const ch of base64.replace(/=+$/, '')) {
    const val = chars.indexOf(ch);
    if (val < 0) continue;
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) { bits -= 8; bytes.push((buffer >> bits) & 255); }
  }
  return new Uint8Array(bytes).buffer;
}

async function attachRemotePath(item: MediaUploadQueueItem) {
  const db = getDatabase();
  const now = new Date().toISOString();
  await db.runAsync("UPDATE local_media SET upload_status='uploaded', remote_path=?, updated_at=? WHERE entity_type=? AND entity_id=? AND local_uri=?;", [item.remotePath, now, item.entityType, item.entityId, item.localUri]);
  if (item.entityType === 'business') {
    await db.runAsync('UPDATE local_businesses SET remote_photo_path=?, updated_at=? WHERE id=?;', [item.remotePath, now, item.entityId]);
  }
}

export async function uploadPendingMedia(limit = 10) {
  const jobs = (await MediaUploadRepository.getPending()).slice(0, limit);
  let uploaded = 0, failed = 0;
  for (const job of jobs) {
    try {
      await MediaUploadRepository.updateStatus(job.id, 'uploading');
      const info = await FileSystem.getInfoAsync(job.localUri);
      if (!info.exists) throw new Error('LOCAL_MEDIA_FILE_MISSING');
      const body = await uriToArrayBuffer(job.localUri);
      const { error } = await nativeSupabase.storage.from(job.bucket).upload(job.remotePath, body, { contentType: contentTypeFor(job), upsert: true });
      if (error) throw error;
      await attachRemotePath(job);
      await MediaUploadRepository.markUploaded(job.id);
      uploaded++;
    } catch (error) {
      await MediaUploadRepository.updateStatus(job.id, 'failed', error instanceof Error ? error.message : String(error));
      failed++;
    }
  }
  return { attempted: jobs.length, uploaded, failed, remaining: await MediaUploadRepository.countPending() };
}
