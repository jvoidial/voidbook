import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

const BUCKETS = { avatar: 'avatars', cover: 'covers', post: 'posts' };

export async function pickImage({ allowsEditing = true, quality = 0.8 } = {}) {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Photo library permission denied');
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing, quality, aspect: allowsEditing ? [1, 1] : undefined
  });
  if (res.canceled) return null;
  return res.assets[0];
}

export async function pickVideo() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Photo library permission denied');
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    quality: 0.7
  });
  if (res.canceled) return null;
  return res.assets[0];
}

export async function takePhoto() {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error('Camera permission denied');
  const res = await ImagePicker.launchCameraAsync({
    allowsEditing: true, quality: 0.8, aspect: [1, 1]
  });
  if (res.canceled) return null;
  return res.assets[0];
}

// Upload a local file URI to Supabase Storage, returns the public URL
export async function uploadMedia(asset, kind, userId) {
  const bucket = BUCKETS[kind] || 'posts';
  const ext = (asset.uri.split('.').pop() || 'jpg').toLowerCase();
  const path = `${userId}/${Date.now()}.${ext}`;
  const contentType = asset.mimeType || (ext === 'mp4' ? 'video/mp4' : 'image/jpeg');

  // Convert URI → ArrayBuffer for React Native
  const resp = await fetch(asset.uri);
  const blob = await resp.blob();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType, upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
