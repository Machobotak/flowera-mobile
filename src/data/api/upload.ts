/**
 * Helper upload multipart ke Flowera API.
 *
 * Semua endpoint upload backend memakai `FileInterceptor`/`FilesInterceptor`
 * (lihat `flowera-api/src/common/decorators/upload-file(s).decorator.ts`),
 * jadi body harus `multipart/form-data`:
 *   - kamera web menghasilkan data URI (`data:image/jpeg;base64,…`)
 *   - kamera native menghasilkan file URI (`file:///…`)
 * Keduanya perlu dibungkus `FormData` dengan cara berbeda.
 *
 * `Content-Type` sengaja dihapus (null) supaya XHR/fetch mengisi sendiri
 * beserta boundary-nya — kalau dipaksa `multipart/form-data` tanpa boundary,
 * multer menolak body ("Boundary not found").
 */

import { Platform } from 'react-native';

import { api } from './client';
import { logApiError, toUserMessage } from './errors';

/** Gambar lokal hasil kamera / data URI web. */
export interface LocalImage {
  uri: string;
  name?: string;
  type?: string;
}

function fileName(file: LocalImage, index: number): string {
  if (file.name) return file.name;

  const fromUri = file.uri.split('?')[0]?.split('/').pop() ?? '';
  const hasExtension = /\.[a-z0-9]+$/i.test(fromUri);
  return hasExtension ? fromUri : `flowera-${Date.now()}-${index}.jpg`;
}

/** Bangun FormData dari daftar gambar + field tambahan (opsional). */
export async function buildImageFormData(
  field: string,
  files: LocalImage[],
  extra?: Record<string, string | number | undefined>,
): Promise<FormData> {
  const form = new FormData();

  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value !== undefined) form.append(key, String(value));
    }
  }

  for (const [index, file] of files.entries()) {
    const name = fileName(file, index);
    const type = file.type ?? 'image/jpeg';

    if (Platform.OS === 'web') {
      const response = await fetch(file.uri);
      form.append(field, await response.blob(), name);
    } else {
      // React Native menerima objek { uri, name, type } sebagai file FormData.
      form.append(field, { uri: file.uri, name, type } as unknown as Blob);
    }
  }

  return form;
}

/**
 * Kirim multipart ke `path` (relatif terhadap base `/api`).
 * `field` adalah nama field yang dibaca backend (`file`/`files`/`variants`).
 * `PUT` dipakai endpoint update varian/add-on backend.
 */
async function sendImages<T>(
  method: 'post' | 'put',
  path: string,
  field: string,
  files: LocalImage[],
  extra?: Record<string, string | number | undefined>,
): Promise<T> {
  try {
    const form = await buildImageFormData(field, files, extra);
    const { data } = await api.request<T>({
      method,
      url: path,
      data: form,
      // null = hapus header JSON default supaya boundary otomatis terpasang.
      headers: { 'Content-Type': null },
    });
    return data;
  } catch (error) {
    logApiError(`upload:${path}`, error);
    throw new Error(toUserMessage(error, 'Gagal mengunggah foto.'));
  }
}

/** `POST` multipart (endpoint create). */
export async function postImages<T>(
  path: string,
  field: string,
  files: LocalImage[],
  extra?: Record<string, string | number | undefined>,
): Promise<T> {
  return sendImages<T>('post', path, field, files, extra);
}

/** `PUT` multipart (endpoint update varian/add-on). */
export async function putImages<T>(
  path: string,
  field: string,
  files: LocalImage[],
  extra?: Record<string, string | number | undefined>,
): Promise<T> {
  return sendImages<T>('put', path, field, files, extra);
}
