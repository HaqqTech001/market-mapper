import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { getDatabase } from '@/src/db/sqlite';
import { MediaUploadRepository } from '@/src/db/repositories/MediaUploadRepository';

export type StagedBusinessPhoto = {
  localUri: string;
  thumbnailUri?: string;
  mimeType: string;
  width?: number;
  height?: number;
  fileSize?: number;
};

async function stageAsset(asset: ImagePicker.ImagePickerAsset): Promise<StagedBusinessPhoto> {
  const result = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: Math.min(asset.width || 1600, 1600) } }],
    { compress: 0.72, format: ImageManipulator.SaveFormat.JPEG }
  );
  const dir = FileSystem.documentDirectory + 'field-media/';
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const fileName = 'business_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.jpg';
  const localUri = dir + fileName;
  await FileSystem.copyAsync({ from: result.uri, to: localUri });
  const info = await FileSystem.getInfoAsync(localUri);
  return { localUri, mimeType: 'image/jpeg', width: result.width, height: result.height, fileSize: info.exists && 'size' in info ? info.size : undefined };
}

export async function captureBusinessPhotoFromCamera() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error('CAMERA_PERMISSION_REQUIRED');
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.9 });
  if (result.canceled || !result.assets[0]) return null;
  return stageAsset(result.assets[0]);
}

export async function chooseBusinessPhotoFromLibrary() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('PHOTO_LIBRARY_PERMISSION_REQUIRED');
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false, quality: 0.9 });
  if (result.canceled || !result.assets[0]) return null;
  return stageAsset(result.assets[0]);
}

export async function persistBusinessPhoto(userId: string, businessId: string, photo: StagedBusinessPhoto) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const mediaId = 'lm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const remotePath = userId + '/businesses/' + businessId + '/' + mediaId + '.jpg';
  await db.runAsync(
    "INSERT INTO local_media (id, owner_user_id, entity_type, entity_id, media_type, local_uri, thumbnail_uri, mime_type, width, height, file_size, capture_source, upload_status, remote_path, created_at, updated_at) VALUES (?, ?, 'business', ?, 'photo', ?, ?, ?, ?, ?, ?, 'field_capture', 'local_only', ?, ?, ?);",
    [mediaId, userId, businessId, photo.localUri, photo.thumbnailUri || null, photo.mimeType, photo.width || null, photo.height || null, photo.fileSize || null, remotePath, now, now]
  );
  await db.runAsync("UPDATE local_businesses SET local_photo_uri=?, photo_declined=0, photo_state='captured', updated_at=? WHERE id=?;", [photo.localUri, now, businessId]);
  await MediaUploadRepository.enqueue({ localUri: photo.localUri, bucket: 'field-media', remotePath, entityType: 'business', entityId: businessId, mediaType: 'photo' });
  return { mediaId, remotePath };
}
