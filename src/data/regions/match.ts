/**
 * Pencocokan nama wilayah dari reverse geocoding ke data Regions API.
 *
 * Nama dari geocoder perangkat tidak konsisten dengan CSV wilayah:
 *   - "Kota Bandung" vs "Bandung" (prefix kota/kabupaten)
 *   - "Special Capital Region of Jakarta" vs "Dki Jakarta"
 *   - "West Java" (locale Inggris) vs "Jawa Barat"
 * Jadi nama dinormalisasi dulu (lowercase, buang prefix administratif),
 * provinsi diterjemahkan lewat alias, lalu dicocokkan exact → contains.
 */

import type { Region } from './regions-api';

const ADMIN_PREFIX =
  /^(provinsi|propinsi|prov|kota administrasi|kota|kabupaten administrasi|kabupaten|kab|kecamatan|kec|kelurahan|desa|village|district|city|regency|province|special region of|special capital region of|daerah khusus ibukota|daerah istimewa)\b/;

/** Huruf kecil, tanpa aksen/tanda baca, tanpa prefix administratif. */
export function normalizeRegionName(name: string): string {
  let value = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  // Prefix bisa bertumpuk, mis. "kota administrasi jakarta selatan".
  for (let i = 0; i < 3; i += 1) {
    const next = value.replace(ADMIN_PREFIX, '').trim();
    if (next === value) break;
    value = next;
  }

  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Nama provinsi dari geocoder (sering bahasa Inggris) → nama di CSV.
 * Key & value sudah dalam bentuk ternormalisasi.
 */
const PROVINCE_ALIASES: Record<string, string> = {
  'west java': 'jawa barat',
  'central java': 'jawa tengah',
  'east java': 'jawa timur',
  yogyakarta: 'yogyakarta',
  'west nusa tenggara': 'nusa tenggara barat',
  'east nusa tenggara': 'nusa tenggara timur',
  'west kalimantan': 'kalimantan barat',
  'central kalimantan': 'kalimantan tengah',
  'south kalimantan': 'kalimantan selatan',
  'east kalimantan': 'kalimantan timur',
  'north kalimantan': 'kalimantan utara',
  'north sulawesi': 'sulawesi utara',
  'central sulawesi': 'sulawesi tengah',
  'south sulawesi': 'sulawesi selatan',
  'southeast sulawesi': 'sulawesi tenggara',
  'south east sulawesi': 'sulawesi tenggara',
  'west sulawesi': 'sulawesi barat',
  'north maluku': 'maluku utara',
  'west papua': 'papua barat',
  'southwest papua': 'papua barat daya',
  'south west papua': 'papua barat daya',
  'south papua': 'papua selatan',
  'central papua': 'papua tengah',
  'papua highlands': 'papua pegunungan',
  'highland papua': 'papua pegunungan',
  'west sumatra': 'sumatera barat',
  'north sumatra': 'sumatera utara',
  'south sumatra': 'sumatera selatan',
  'riau islands': 'kepulauan riau',
  'bangka belitung': 'kepulauan bangka belitung',
  'bangka belitung islands': 'kepulauan bangka belitung',
  jakarta: 'dki jakarta',
  'jakarta raya': 'dki jakarta',
};

export function canonicalProvinceName(name: string): string {
  const normalized = normalizeRegionName(name);
  return PROVINCE_ALIASES[normalized] ?? normalized;
}

function itemKey(region: Region, province: boolean): string {
  return province
    ? canonicalProvinceName(region.name)
    : normalizeRegionName(region.name);
}

/**
 * Tipe wilayah administratif. CSV Regions API membuang prefix "Kabupaten",
 * jadi nama tanpa prefix dianggap kabupaten (contoh: "Bandung" = Kab. Bandung,
 * sedangkan "Kota Bandung" = kota).
 */
function adminType(name: string): 'kota' | 'kabupaten' {
  return /^kota\b/i.test(name) ? 'kota' : 'kabupaten';
}

function hasExplicitType(name: string): boolean {
  return /^(kota|kabupaten|kab)\b/i.test(name);
}

/**
 * Cari satu wilayah dari beberapa kandidat nama (urutan = prioritas).
 *
 * `preferCity` dipakai untuk daftar kota/kabupaten: geocoder biasanya
 * mengembalikan nama generik ("Bandung", "Bogor"). Nama generik diarahkan ke
 * "Kota ..." lebih dulu karena alamat pengiriman hampir selalu di area kota;
 * kalau kandidat menyebut "Kabupaten ..." secara eksplisit, kabupaten yang
 * dipilih.
 */
export function matchRegion(
  list: Region[],
  candidates: (string | null | undefined)[],
  options: { province?: boolean; preferCity?: boolean } = {},
): Region | null {
  const province = options.province === true;
  const preferCity = options.preferCity === true;
  const names = candidates
    .map((candidate) => candidate?.trim())
    .filter((candidate): candidate is string => Boolean(candidate));

  if (names.length === 0) return null;

  for (const name of names) {
    const key = province ? canonicalProvinceName(name) : normalizeRegionName(name);
    const explicit = preferCity && hasExplicitType(name);

    if (explicit) {
      const wanted = adminType(name);
      const typed = list.find(
        (region) => itemKey(region, province) === key && adminType(region.name) === wanted,
      );
      if (typed) return typed;
    } else if (preferCity) {
      const kota = list.find(
        (region) =>
          itemKey(region, province) === key && adminType(region.name) === 'kota',
      );
      if (kota) return kota;
    }

    const raw = list.find((region) => region.name.toLowerCase() === name.toLowerCase());
    if (raw) return raw;

    const equal = list.find((region) => itemKey(region, province) === key);
    if (equal) return equal;

    if (key.length >= 3) {
      const contains = list.find((region) => {
        const regionKey = itemKey(region, province);
        return regionKey.includes(key) || key.includes(regionKey);
      });
      if (contains) return contains;
    }
  }

  return null;
}
