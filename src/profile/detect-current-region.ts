/**
 * Deteksi wilayah dari sebuah titik koordinat.
 *
 * Reverse geocoding dilakukan oleh Regions API (`GET /api/reverse`, proxy
 * Nominatim/OSM) — bukan `expo-location.reverseGeocodeAsync`, yang di web
 * sudah dihapus sejak SDK 49 dan di Android bergantung pada layanan Google di
 * perangkat. Titik berasal dari peta di `map-picker-modal`.
 *
 * Nama wilayah hasil geocoding lalu dicocokkan ke data Regions API
 * (`resolveRegionNames`) untuk mendapatkan ID provinsi/kota/kecamatan.
 */

import {
  reverseGeocode,
  type ReverseGeocodeResult,
} from '@/data/regions/regions-api';
import {
  resolveRegionNames,
  type ResolvedRegion,
} from '@/data/regions/resolve';

export interface DetectedRegion extends ResolvedRegion {
  postalCode: string | null;
  addressLine: string | null;
}

const REGION_SERVICE_ERROR =
  'Tidak bisa menghubungi layanan data wilayah. Periksa koneksi ke server wilayah lalu coba lagi.';

/** Titik → nama wilayah → ID wilayah. Melempar `Error` berbahasa Indonesia. */
export async function detectRegionFromCoordinates(
  latitude: number,
  longitude: number,
): Promise<DetectedRegion> {
  let place: ReverseGeocodeResult | null;
  try {
    place = await reverseGeocode(latitude, longitude);
  } catch (error) {
    console.warn('[location] reverse geocode gagal', error);
    throw new Error(REGION_SERVICE_ERROR);
  }

  if (!place) {
    throw new Error(
      'Alamat untuk titik tersebut tidak ditemukan. Geser peta sedikit atau isi alamat manual.',
    );
  }

  let regions: ResolvedRegion;
  try {
    regions = await resolveRegionNames({
      provinceName: place.province,
      cityName: place.city,
      districtName: place.district,
      villageName: place.village,
    });
  } catch (error) {
    console.warn('[location] resolusi wilayah gagal', error);
    throw new Error(REGION_SERVICE_ERROR);
  }

  return {
    ...regions,
    postalCode: place.postalCode,
    addressLine: place.addressLine,
  };
}
