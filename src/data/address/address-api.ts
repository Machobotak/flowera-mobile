/**
 * Service alamat user Flowera API (`/api/user/address`).
 * `findAll` mengembalikan 404 kalau user belum punya profil (alamat mustahil
 * ada); kondisi itu dipetakan ke daftar kosong, bukan error.
 */

import { isAxiosError } from 'axios';

import { api } from '@/data/api/client';
import { logApiError, toUserMessage } from '@/data/api/errors';
import type { AddressInput, UserAddress } from './types';

interface AddressPayload {
  id: number;
  nama_penerima?: string | null;
  no_hp?: string | null;
  address?: string | null;
  note?: string | null;
  province_name?: string | null;
  city_name?: string | null;
  district_name?: string | null;
  subdistrict_name?: string | null;
  zip_code?: string | null;
  subdistrict_id?: string | null;
}

interface AddressListResponse {
  status: string;
  data: AddressPayload[] | null;
  message?: string;
}

function mapAddress(raw: AddressPayload): UserAddress {
  return {
    id: raw.id,
    nama_penerima: raw.nama_penerima ?? '',
    no_hp: raw.no_hp ?? '',
    address: raw.address ?? '',
    note: raw.note ?? null,
    province_name: raw.province_name ?? null,
    city_name: raw.city_name ?? null,
    district_name: raw.district_name ?? null,
    subdistrict_name: raw.subdistrict_name ?? null,
    zip_code: raw.zip_code ?? null,
    subdistrict_id: raw.subdistrict_id ?? null,
  };
}

export async function listAddresses(): Promise<UserAddress[]> {
  try {
    const { data } = await api.get<AddressListResponse>('/user/address');
    return (data.data ?? []).map(mapAddress);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return [];
    }
    logApiError('address:list', error);
    throw new Error(toUserMessage(error, 'Gagal memuat alamat.'));
  }
}

/** Buang field opsional yang kosong supaya PATCH tidak menimpa dengan "". */
function cleanPayload(input: AddressInput): AddressInput {
  const payload: AddressInput = {
    nama_penerima: input.nama_penerima,
    no_hp: input.no_hp,
    address: input.address,
  };

  if (input.note) payload.note = input.note;
  if (input.province_name) payload.province_name = input.province_name;
  if (input.city_name) payload.city_name = input.city_name;
  if (input.district_name) payload.district_name = input.district_name;
  if (input.subdistrict_name) payload.subdistrict_name = input.subdistrict_name;
  if (input.zip_code) payload.zip_code = input.zip_code;
  if (input.subdistrict_id) payload.subdistrict_id = input.subdistrict_id;

  return payload;
}

export async function createAddress(input: AddressInput): Promise<void> {
  try {
    await api.post('/user/address', cleanPayload(input));
  } catch (error) {
    logApiError('address:create', error);
    throw new Error(toUserMessage(error, 'Gagal menambahkan alamat.'));
  }
}

export async function updateAddress(
  id: number,
  input: AddressInput,
): Promise<void> {
  try {
    await api.patch(`/user/address/${id}`, cleanPayload(input));
  } catch (error) {
    logApiError('address:update', error);
    throw new Error(toUserMessage(error, 'Gagal menyimpan perubahan alamat.'));
  }
}

export async function deleteAddress(id: number): Promise<void> {
  try {
    await api.delete(`/user/address/${id}`);
  } catch (error) {
    logApiError('address:delete', error);
    throw new Error(toUserMessage(error, 'Gagal menghapus alamat.'));
  }
}
