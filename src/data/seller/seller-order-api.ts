/**
 * Service pesanan sisi penjual (Seller Center).
 *
 * Kontrak dari `flowera-api/src/seller/order/order.controller.ts`:
 *   GET   /seller/order                    → { status, data: Order[] }
 *   GET   /seller/order/:id                → { status, data: Order + relasi }
 *   PATCH /seller/order/:id/status         body { status }
 *   POST  /seller/order/:id/upload-image   multipart field `file` + body `note`
 *
 * Transisi status yang diizinkan backend (`SELLER_TRANSITIONS` di
 * `order.service.ts`): PAID → CONFIRM_SELLER → PROSES_PENGERJAAN →
 * CONFIRM_USER, lalu CONFIRM_RECEIVED → DELIVERY. Status lain tidak bisa
 * dilompati; pesan error server ditampilkan apa adanya.
 *
 * Peta label/warna/aksi ada di `seller-order-status.ts`.
 */

import { api, resolveStorageUrl } from '@/data/api/client';
import { postImages } from '@/data/api/upload';
import { logApiError, toUserMessage } from '@/data/api/errors';

/* ──────────────────────────── Model ──────────────────────────── */

export interface SellerOrderAddress {
  recipient: string | null;
  phone: string | null;
  address: string | null;
  note: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  subdistrict: string | null;
  zipCode: string | null;
}

export interface SellerOrder {
  id: number;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  address: SellerOrderAddress | null;
}

export interface SellerOrderItem {
  id: number;
  productName: string;
  productImage: string | null;
  variantTitle: string | null;
  quantity: number;
  price: number;
  subTotal: number;
  addon: string | null;
}

export interface SellerOrderProof {
  id: number;
  imageUrl: string | null;
  note: string | null;
  status: string;
  createdAt: string | null;
}

export interface SellerOrderDetail extends SellerOrder {
  items: SellerOrderItem[];
  proofs: SellerOrderProof[];
}

/* ──────────────────────────── Raw response ──────────────────────────── */

interface ApiImage {
  id?: number;
  image_url?: string | null;
  isDefault?: number | boolean;
}

interface ApiAddress {
  nama_penerima?: string | null;
  no_hp?: string | null;
  address?: string | null;
  note?: string | null;
  province_name?: string | null;
  city_name?: string | null;
  district_name?: string | null;
  subdistrict_name?: string | null;
  zip_code?: string | null;
}

interface ApiCustomer {
  id?: number;
  name?: string | null;
  email?: string | null;
  phone_number?: string | null;
}

interface ApiOrderItem {
  id: number;
  quantity: number;
  price?: number | null;
  subTotal?: number | null;
  addon_product?: string | null;
  product_id?: {
    name?: string | null;
    product_image?: ApiImage[] | null;
  } | null;
  product_variant_id?: { title?: string | null } | null;
}

interface ApiProof {
  id: number;
  image_url?: string | null;
  note?: string | null;
  status?: string | null;
  createdAt?: string | null;
}

interface ApiOrder {
  id: number;
  orderNumber: string;
  status: string;
  total: number | null;
  createdAt?: string | null;
  user_id?: ApiCustomer | null;
  address?: ApiAddress | null;
  order_item?: ApiOrderItem[] | null;
  order_image_confirmed?: ApiProof[] | null;
}

interface ApiEnvelope<T> {
  status: string;
  data: T;
}

/* ──────────────────────────── Mapping ──────────────────────────── */

function toNumber(value: string | number | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function primaryImage(images?: ApiImage[] | null): string | null {
  if (!images || images.length === 0) return null;
  const primary = images.find((image) => Boolean(image.isDefault)) ?? images[0];
  return resolveStorageUrl(primary?.image_url);
}

function mapAddress(address?: ApiAddress | null): SellerOrderAddress | null {
  if (!address) return null;

  return {
    recipient: text(address.nama_penerima),
    phone: text(address.no_hp),
    address: text(address.address),
    note: text(address.note),
    province: text(address.province_name),
    city: text(address.city_name),
    district: text(address.district_name),
    subdistrict: text(address.subdistrict_name),
    zipCode: text(address.zip_code),
  };
}

function mapOrder(order: ApiOrder): SellerOrder {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    total: toNumber(order.total),
    createdAt: order.createdAt ?? null,
    customerName: text(order.user_id?.name) ?? 'Pembeli',
    customerEmail: text(order.user_id?.email) ?? '',
    customerPhone: text(order.user_id?.phone_number),
    address: mapAddress(order.address),
  };
}

function mapItem(item: ApiOrderItem): SellerOrderItem {
  return {
    id: item.id,
    productName: text(item.product_id?.name) ?? 'Produk',
    productImage: primaryImage(item.product_id?.product_image),
    variantTitle: text(item.product_variant_id?.title),
    quantity: toNumber(item.quantity),
    price: toNumber(item.price),
    subTotal: toNumber(item.subTotal),
    addon: text(item.addon_product),
  };
}

function mapDetail(order: ApiOrder): SellerOrderDetail {
  return {
    ...mapOrder(order),
    items: (order.order_item ?? []).map(mapItem),
    proofs: (order.order_image_confirmed ?? []).map((proof) => ({
      id: proof.id,
      imageUrl: resolveStorageUrl(proof.image_url),
      note: text(proof.note),
      status: text(proof.status) ?? 'PENDING',
      createdAt: proof.createdAt ?? null,
    })),
  };
}

/* ──────────────────────────── Request ──────────────────────────── */

/** `GET /seller/order` — satu baris per order yang memuat produk toko ini. */
export async function fetchSellerOrders(
  signal?: AbortSignal,
): Promise<SellerOrder[]> {
  try {
    const { data } = await api.get<ApiEnvelope<ApiOrder[] | null>>(
      '/seller/order',
      { signal },
    );

    return (data.data ?? []).map(mapOrder);
  } catch (error) {
    logApiError('seller:order:list', error);
    throw new Error(toUserMessage(error, 'Gagal memuat pesanan masuk.'));
  }
}

/** `GET /seller/order/:id` — detail lengkap termasuk item & foto buket. */
export async function fetchSellerOrderDetail(
  orderId: number,
  signal?: AbortSignal,
): Promise<SellerOrderDetail> {
  try {
    const { data } = await api.get<ApiEnvelope<ApiOrder | null>>(
      `/seller/order/${orderId}`,
      { signal },
    );

    if (!data.data) throw new Error('Pesanan tidak ditemukan.');
    return mapDetail(data.data);
  } catch (error) {
    logApiError('seller:order:detail', error);
    throw new Error(toUserMessage(error, 'Gagal memuat detail pesanan.'));
  }
}

/** `PATCH /seller/order/:id/status`. */
export async function updateSellerOrderStatus(
  orderId: number,
  status: string,
): Promise<string> {
  try {
    const { data } = await api.patch<{ status: string; message?: string }>(
      `/seller/order/${orderId}/status`,
      { status },
    );

    return data.message ?? 'Status pesanan diperbarui.';
  } catch (error) {
    logApiError('seller:order:status', error);
    throw new Error(toUserMessage(error, 'Gagal mengubah status pesanan.'));
  }
}

/**
 * `POST /seller/order/:id/upload-image` — hanya saat status
 * PROSES_PENGERJAAN. Setelah upload, seller masih harus memindahkan status ke
 * CONFIRM_USER agar pembeli bisa menyetujui foto.
 */
export async function uploadSellerOrderImage(
  orderId: number,
  uri: string,
  note?: string,
): Promise<void> {
  await postImages(
    `/seller/order/${orderId}/upload-image`,
    'file',
    [{ uri }],
    note?.trim() ? { note: note.trim() } : undefined,
  );
}
