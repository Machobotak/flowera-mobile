/**
 * Versi web penyimpanan foto profil.
 *
 * Browser tidak punya file system native maupun galeri perangkat, jadi foto
 * hasil kamera (data URI) dipakai apa adanya dan hanya bertahan selama sesi.
 * Modul terpisah ini mencegah `expo-file-system`/`expo-media-library` ikut
 * dieksekusi di web.
 */

import type { SavedProfilePhoto } from './photo-storage';

export function getSavedProfilePhoto(): SavedProfilePhoto | null {
  return null;
}

export function saveProfilePhoto(
  sourceUri: string,
  _userId: number,
): string {
  return sourceUri;
}

export async function savePhotoToLibrary(_localUri: string): Promise<boolean> {
  return false;
}
