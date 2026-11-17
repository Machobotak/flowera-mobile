/**
 * Regions API (indonesia-regions-api) — data provinsi/kota/kecamatan/kelurahan.
 *
 * Service ini terpisah dari Flowera API: base URL-nya dari
 * `EXPO_PUBLIC_REGIONAL_API_BASE_URL` (default `http://localhost:3000`) dan
 * prefix-nya `/api`:
 *
 *   GET /api/provinces
 *   GET /api/cities/:provinceId
 *   GET /api/districts/:cityId
 *   GET /api/villages/:districtId
 *
 * Semua response berformat `{ status, message, data }` dengan `id` berupa
 * string. Data wilayah statis, jadi daftar disimpan di cache memori: pindah
 * antar picker tidak memicu request ulang.
 */

import { create, isAxiosError } from 'axios';

const DEFAULT_REGIONAL_API_BASE_URL = 'http://localhost:3000';

/** Base URL tanpa trailing slash. */
export const REGIONAL_API_BASE_URL = (
  process.env.EXPO_PUBLIC_REGIONAL_API_BASE_URL ??
  DEFAULT_REGIONAL_API_BASE_URL
).replace(/\/+$/, '');

export interface Region {
  id: string;
  name: string;
}

interface RegionsResponse {
  status: boolean;
  message: string;
  data: Region[] | null;
}

const regionsApi = create({
  baseURL: `${REGIONAL_API_BASE_URL}/api`,
  timeout: 15000,
});

const cache = new Map<string, Region[]>();
const inFlight = new Map<string, Promise<Region[]>>();

function fetchRegionList(key: string, path: string): Promise<Region[]> {
  const cached = cache.get(key);
  if (cached) return Promise.resolve(cached);

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = regionsApi
    .get<RegionsResponse>(path)
    .then(({ data }) => {
      const list = (data.data ?? []).map((region) => ({
        id: String(region.id),
        name: region.name,
      }));
      cache.set(key, list);
      return list;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request;
}

export function getProvinces(): Promise<Region[]> {
  return fetchRegionList('provinces', '/provinces');
}

export function getCities(provinceId: string): Promise<Region[]> {
  return fetchRegionList(`cities:${provinceId}`, `/cities/${provinceId}`);
}

export function getDistricts(cityId: string): Promise<Region[]> {
  return fetchRegionList(`districts:${cityId}`, `/districts/${cityId}`);
}

export function getVillages(districtId: string): Promise<Region[]> {
  return fetchRegionList(`villages:${districtId}`, `/villages/${districtId}`);
}

/**
 * Reverse geocoding lewat Regions API (`GET /api/reverse?lat=&lon=`), bukan
 * `expo-location.reverseGeocodeAsync` yang sudah dihapus di web (SDK 49).
 * Mengembalikan `null` kalau titiknya valid tetapi tidak ada alamat di sana;
 * kegagalan jaringan tetap dilempar supaya bisa dibedakan oleh pemanggil.
 */
export interface ReverseGeocodeResult {
  province: string | null;
  city: string | null;
  district: string | null;
  village: string | null;
  postalCode: string | null;
  addressLine: string | null;
  displayName: string | null;
}

interface ReverseGeocodeResponse {
  status: boolean;
  message: string;
  data: ReverseGeocodeResult | null;
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult | null> {
  try {
    const { data } = await regionsApi.get<ReverseGeocodeResponse>('/reverse', {
      params: { lat: latitude, lon: longitude },
    });
    return data.data ?? null;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}
