/**
 * Penyimpanan foto profil hasil kamera (native).
 *
 * - Foto kamera (`takePictureAsync`) hanya hidup di cache, jadi disalin ke
 *   `Paths.document` agar tetap ada setelah app ditutup.
 * - Nama file memuat id user (`photo-<userId>-<timestamp>.jpg`) supaya foto
 *   hanya ditampilkan ke akun yang membuatnya, dan setiap simpan memakai nama
 *   baru agar cache `expo-image` tidak menampilkan foto lama.
 * - Salinan ke galeri perangkat memakai `expo-media-library` dan bersifat
 *   best-effort: kalau izin/penyimpanan gagal, foto tetap tersimpan di app.
 *
 * Web memakai `photo-storage.web.ts` karena expo-file-system tidak tersedia
 * di browser (modul ini akan crash kalau dieksekusi di web).
 */

import { Directory, File, Paths } from 'expo-file-system';
import { Asset, requestPermissionsAsync } from 'expo-media-library';

const PHOTO_DIRECTORY = 'profile-photos';
const PHOTO_PREFIX = 'photo-';
const PHOTO_FILE_PATTERN = /^photo-(\d+)-(\d+)\.jpg$/;

export interface SavedProfilePhoto {
  userId: number;
  uri: string;
}

/** Foto profil lokal milik salah satu akun, atau `null` kalau belum ada. */
export function getSavedProfilePhoto(): SavedProfilePhoto | null {
  const directory = new Directory(Paths.document, PHOTO_DIRECTORY);
  if (!directory.exists) {
    return null;
  }

  let latest: { userId: number; timestamp: number; file: File } | null = null;
  for (const entry of directory.list()) {
    if (!(entry instanceof File)) {
      continue;
    }
    const match = PHOTO_FILE_PATTERN.exec(entry.name);
    if (!match) {
      continue;
    }
    const timestamp = Number(match[2]);
    if (!latest || timestamp > latest.timestamp) {
      latest = { userId: Number(match[1]), timestamp, file: entry };
    }
  }

  return latest ? { userId: latest.userId, uri: latest.file.uri } : null;
}

/**
 * Menyalin hasil kamera ke penyimpanan permanen app dan menghapus foto lama
 * milik user yang sama.
 * Melempar error kalau penyalinan gagal supaya UI bisa memberi tahu user.
 */
export function saveProfilePhoto(sourceUri: string, userId: number): string {
  const directory = new Directory(Paths.document, PHOTO_DIRECTORY);
  directory.create({ idempotent: true, intermediates: true });

  const prefix = `${PHOTO_PREFIX}${userId}-`;
  const target = new File(directory, `${prefix}${Date.now()}.jpg`);
  new File(sourceUri).copySync(target);

  for (const entry of directory.list()) {
    if (
      entry instanceof File &&
      entry.uri !== target.uri &&
      entry.name.startsWith(prefix)
    ) {
      entry.delete();
    }
  }

  return target.uri;
}

/**
 * Menyimpan salinan foto ke galeri perangkat.
 * @returns `true` kalau foto masuk ke galeri, `false` kalau izin ditolak
 * atau penyimpanan gagal.
 */
export async function savePhotoToLibrary(localUri: string): Promise<boolean> {
  try {
    const permission = await requestPermissionsAsync(true, ['photo']);
    if (!permission.granted) {
      return false;
    }
    await Asset.create(localUri);
    return true;
  } catch (error) {
    console.warn('[profile] gagal menyimpan foto ke galeri', error);
    return false;
  }
}
