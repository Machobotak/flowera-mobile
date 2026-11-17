/**
 * Service toko penjual Flowera API.
 *
 * Kontrak diambil dari controller yang berjalan (`flowera-api`):
 *   POST /seller/store/create      (JwtAuthGuard, tanpa @Roles) → 201
 *        body `StoreCreateDto`; respons hanya `{ status, message }`
 *   GET  /seller/store/detail      (@Roles('seller')) → `{ status, data: Store }`
 *   PUT  /seller/store/update      (@Roles('seller')) → `{ status, message }`
 *   POST /seller/store/upload/logo (@Roles('seller'), multipart field `file`)
 *
 * Catatan penting:
 *   - `create` tidak mengembalikan id toko; setelah sukses app wajib memanggil
 *     `GET /auth/me` karena role `seller` baru terbaca dari tabel SELLER
 *     (`auth.service.ts:209/242`), bukan dari token lama.
 *   - `logo` disimpan sebagai object name MinIO (`stores/xxx.jpg`), bukan path
 *     berawalan `/`; pemetaan URL ada di `store-logo-url.ts`.
 */

import { api, resolveStorageUrl } from '@/data/api/client';
import { postImages } from '@/data/api/upload';
import { logApiError, toUserMessage } from '@/data/api/errors';

export interface StoreDetail {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  address: string;
  type: string;
  description: string;
  rating: number;
  city: string;
  provinceName: string | null;
  cityName: string | null;
  districtName: string | null;
  subdistrictName: string | null;
  zipCode: string | null;
  subdistrictId: string | null;
  phoneNumber: string | null;
  email: string | null;
}

/** Body `StoreCreateDto` / `StoreUpdateDto` (update = partial). */
export interface StoreInput {
  name: string;
  address: string;
  type: string;
  description: string;
  city: string;
  provinceName?: string;
  cityName?: string;
  districtName?: string;
  subdistrictName?: string;
  zipCode?: string;
  subdistrictId?: string;
  phoneNumber?: string;
}

interface ApiStore {
  id: number;
  name: string;
  slug: string;
  logo?: string | null;
  address: string;
  type: string;
  description: string;
  rating?: string | number | null;
  city: string;
  province_name?: string | null;
  city_name?: string | null;
  district_name?: string | null;
  subdistrict_name?: string | null;
  zip_code?: string | null;
  subdistrict_id?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
}

interface ApiStoreEnvelope {
  status: string;
  data: ApiStore | null;
}

function text(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapStore(store: ApiStore): StoreDetail {
  const rating = Number(store.rating);

  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    logo: resolveStorageUrl(store.logo),
    address: store.address ?? '',
    type: store.type ?? '',
    description: store.description ?? '',
    rating: Number.isFinite(rating) ? rating : 0,
    city: store.city ?? '',
    provinceName: text(store.province_name),
    cityName: text(store.city_name),
    districtName: text(store.district_name),
    subdistrictName: text(store.subdistrict_name),
    zipCode: text(store.zip_code),
    subdistrictId: text(store.subdistrict_id),
    phoneNumber: text(store.phoneNumber),
    email: text(store.email),
  };
}

/* ──────────────────────────── Request ──────────────────────────── */

/** `POST /seller/store/create` — mengubah akun user menjadi seller + toko. */
export async function createStore(input: StoreInput): Promise<void> {
  try {
    await api.post('/seller/store/create', {
      name: input.name,
      address: input.address,
      type: input.type || 'TOKO',
      description: input.description,
      city: input.city,
      province_name: input.provinceName,
      city_name: input.cityName,
      district_name: input.districtName,
      subdistrict_name: input.subdistrictName,
      zip_code: input.zipCode,
      subdistrict_id: input.subdistrictId,
      phoneNumber: input.phoneNumber,
    });
  } catch (error) {
    logApiError('seller:store:create', error);
    throw new Error(toUserMessage(error, 'Gagal membuat toko.'));
  }
}

/** `GET /seller/store/detail` — hanya untuk akun ber-role `seller`. */
export async function fetchStoreDetail(
  signal?: AbortSignal,
): Promise<StoreDetail> {
  try {
    const { data } = await api.get<ApiStoreEnvelope>('/seller/store/detail', {
      signal,
    });

    if (!data.data) {
      throw new Error('Data toko tidak ditemukan.');
    }

    return mapStore(data.data);
  } catch (error) {
    logApiError('seller:store:detail', error);
    throw new Error(toUserMessage(error, 'Gagal memuat data toko.'));
  }
}

/** `PUT /seller/store/update` — backend meng-overwrite kolom yang dikirim. */
export async function updateStore(input: StoreInput): Promise<void> {
  try {
    await api.put('/seller/store/update', {
      name: input.name,
      address: input.address,
      type: input.type || 'TOKO',
      description: input.description,
      city: input.city,
      province_name: input.provinceName,
      city_name: input.cityName,
      district_name: input.districtName,
      subdistrict_name: input.subdistrictName,
      zip_code: input.zipCode,
      subdistrict_id: input.subdistrictId,
      phoneNumber: input.phoneNumber,
    });
  } catch (error) {
    logApiError('seller:store:update', error);
    throw new Error(toUserMessage(error, 'Gagal menyimpan perubahan toko.'));
  }
}

/** `POST /seller/store/upload/logo` (multipart, field `file`). */
export async function uploadStoreLogo(uri: string): Promise<void> {
  await postImages('/seller/store/upload/logo', 'file', [{ uri }]);
}
