/**
 * Resolusi nama wilayah tersimpan (atau hasil geocoder) menjadi entitas
 * Regions API lengkap dengan ID — dipakai saat edit alamat dan saat mengisi
 * form dari lokasi terkini. Pencarian dilakukan bertingkat supaya kota dengan
 * nama sama di provinsi berbeda tidak tertukar.
 */

import { matchRegion } from './match';
import {
  getCities,
  getDistricts,
  getProvinces,
  getVillages,
  type Region,
} from './regions-api';

export interface RegionNames {
  provinceName?: string | null;
  cityName?: string | null;
  districtName?: string | null;
  villageName?: string | null;
}

export interface ResolvedRegion {
  province: Region | null;
  city: Region | null;
  district: Region | null;
  village: Region | null;
}

const EMPTY: ResolvedRegion = {
  province: null,
  city: null,
  district: null,
  village: null,
};

export async function resolveRegionNames(
  names: RegionNames,
): Promise<ResolvedRegion> {
  if (!names.provinceName) return EMPTY;

  const provinces = await getProvinces();
  const province = matchRegion(provinces, [names.provinceName], {
    province: true,
  });
  if (!province) return EMPTY;

  if (!names.cityName) return { ...EMPTY, province };

  const cities = await getCities(province.id);
  const city = matchRegion(cities, [names.cityName], { preferCity: true });
  if (!city) return { ...EMPTY, province };

  if (!names.districtName) return { ...EMPTY, province, city };

  const districts = await getDistricts(city.id);
  const district = matchRegion(districts, [names.districtName]);
  if (!district) return { ...EMPTY, province, city };

  if (!names.villageName) return { province, city, district, village: null };

  const villages = await getVillages(district.id);
  const village = matchRegion(villages, [names.villageName]);

  return { province, city, district, village };
}
