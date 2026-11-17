/**
 * Tipe alamat user — mengikuti `flowera-api/src/address`:
 *
 *   GET    /api/user/address       → { status, data: UserAddress[] }
 *   GET    /api/user/address/:id   → { status, data: UserAddress }
 *   POST   /api/user/address       ← AddressCreateDto
 *   PATCH  /api/user/address/:id   ← AddressUpdateDto
 *   DELETE /api/user/address/:id
 *
 * Backend hanya menyimpan nama wilayah + `subdistrict_id`; ID provinsi/kota/
 * kecamatan tidak disimpan, jadi saat edit ID tersebut di-resolve ulang dari
 * Regions API berdasarkan nama.
 */

export interface UserAddress {
  id: number;
  nama_penerima: string;
  no_hp: string;
  address: string;
  note: string | null;
  province_name: string | null;
  city_name: string | null;
  district_name: string | null;
  subdistrict_name: string | null;
  zip_code: string | null;
  subdistrict_id: string | null;
}

export interface AddressInput {
  nama_penerima: string;
  no_hp: string;
  address: string;
  note?: string;
  province_name?: string;
  city_name?: string;
  district_name?: string;
  subdistrict_name?: string;
  zip_code?: string;
  subdistrict_id?: string;
}
