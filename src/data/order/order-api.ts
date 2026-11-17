/**
 * Service pesanan pembeli — padanan `app/(buyer)/profile/page.tsx` web.
 *
 * Endpoint backend (`src/user/order/order.controller.ts`):
 *   GET   /api/user/order            → `{ status, data: Order[] }`
 *   GET   /api/user/order/:id        → `{ status, data: Order }`
 *   PATCH /api/user/order/image/:imageId/confirm
 *         body `{ status: 'CONFIRMED' | 'REJECTED', reply_note? }`
 *         (mengubah ORDER.status jadi DELIVERY / PROSES_PENGERJAAN)
 *   PATCH /api/user/order/:id/status body `{ status, reply_note? }`
 *         Di sini `:id` adalah **ORDER_ITEM.id**, bukan ORDER.id. Status yang
 *         diterima: CONFIRM_RECEIVED | PROSES_PENGERJAAN | DITERIMA.
 *         Catatan: backend hanya mengubah ORDER.status lewat panel seller dan
 *         tidak pernah menulis ORDER_ITEM.status, sehingga transisi pembeli di
 *         backend praktis selalu ditolak ("Cannot transition from PENDING").
 *         Aksi tetap dikirim apa adanya supaya pesan backend tampil ke user.
 *
 * `GET /user/order` TIDAK menyertakan relasi `address`, jadi alamat tidak
 * ditampilkan pada daftar pesanan (hanya tersedia di `GET /user/order/:id`).
 */

import type { AxiosInstance } from 'axios';

import { api, resolveAssetUrl } from '@/data/api/client';
import { logApiError, toUserMessage } from '@/data/api/errors';

/* ──────────────────────────── Model UI ──────────────────────────── */

export interface OrderItemAddon {
  name: string;
  price: number;
}

export interface OrderItemModel {
  id: number;
  quantity: number;
  unitPrice: number;
  subTotal: number;
  status: string;
  courierName: string | null;
  courierService: string | null;
  shippingCost: number;
  shippingEtd: string | null;
  productId: number | null;
  productName: string;
  productImage: string | null;
  weightGram: number;
  variantId: number | null;
  variantTitle: string | null;
  storeId: number | null;
  storeName: string | null;
  addons: OrderItemAddon[];
}

/** `ORDER_IMAGE_CONFIRMED` — foto buket yang dikirim seller untuk disetujui. */
export interface OrderImageModel {
  id: number;
  url: string;
  note: string | null;
  replyNote: string | null;
  status: string;
  orderItemId: number | null;
  createdAt: string | null;
}

export interface OrderModel {
  id: number;
  orderNumber: string;
  status: string;
  total: number;
  discount: number;
  itemsTotal: number | null;
  shippingTotal: number | null;
  note: string | null;
  createdAt: string;
  items: OrderItemModel[];
  images: OrderImageModel[];
}

/* ──────────────────────────── Raw response ──────────────────────────── */

interface ApiImage {
  id: number;
  image_url: string;
  isDefault?: number | boolean;
}

interface ApiRawItem {
  id: number;
  quantity: number;
  price: number;
  subTotal?: number;
  status?: string;
  courier_name?: string | null;
  courier_service?: string | null;
  shipping_cost?: number | null;
  shipping_etd?: string | null;
  addon_product?: string | null;
  product_id?: {
    id: number;
    name: string;
    weight?: number | null;
    product_image?: ApiImage[] | null;
  } | null;
  product_variant_id?: { id: number; title: string } | null;
  store_id?: { id: number; name: string } | null;
}

interface ApiRawImage {
  id: number;
  image_url: string;
  note?: string | null;
  reply_note?: string | null;
  status?: string;
  order_item?: { id: number } | null;
  createdAt?: string;
}

interface ApiRawOrder {
  id: number;
  orderNumber: string;
  status: string;
  total: number;
  discount: number;
  items_total?: number | null;
  shipping_total?: number | null;
  note?: string | null;
  createdAt: string;
  order_item?: ApiRawItem[] | null;
  order_image_confirmed?: ApiRawImage[] | null;
}

interface ApiListResponse {
  status: string;
  data: ApiRawOrder[] | null;
}

interface ApiDetailResponse {
  status: string;
  data: ApiRawOrder | null;
}

/* ──────────────────────────── Mapping ──────────────────────────── */

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function primaryImage(images?: ApiImage[] | null): string | null {
  if (!images || images.length === 0) return null;
  const primary = images.find((image) => Boolean(image.isDefault)) ?? images[0];
  return resolveAssetUrl(primary?.image_url);
}

/** `order_item.addon_product` disimpan backend sebagai JSON string. */
function parseAddons(raw?: string | null): OrderItemAddon[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const record = entry as { name?: unknown; title?: unknown; price?: unknown };
        const name =
          typeof record.name === 'string'
            ? record.name
            : typeof record.title === 'string'
              ? record.title
              : null;
        if (!name) return null;
        return { name, price: toNumber(record.price) };
      })
      .filter((addon): addon is OrderItemAddon => addon !== null);
  } catch {
    return [];
  }
}

function mapItem(item: ApiRawItem): OrderItemModel {
  const addons = parseAddons(item.addon_product);

  return {
    id: item.id,
    quantity: toNumber(item.quantity),
    unitPrice:
      toNumber(item.price) ||
      toNumber(item.subTotal) / Math.max(1, toNumber(item.quantity)),
    subTotal: toNumber(item.subTotal),
    status: item.status ?? 'PENDING',
    courierName: item.courier_name?.trim() || null,
    courierService: item.courier_service?.trim() || null,
    shippingCost: toNumber(item.shipping_cost),
    shippingEtd: item.shipping_etd?.trim() || null,
    productId: item.product_id?.id ?? null,
    productName: item.product_id?.name ?? 'Produk',
    productImage: primaryImage(item.product_id?.product_image),
    weightGram: toNumber(item.product_id?.weight),
    variantId: item.product_variant_id?.id ?? null,
    variantTitle: item.product_variant_id?.title ?? null,
    storeId: item.store_id?.id ?? null,
    storeName: item.store_id?.name ?? null,
    addons,
  };
}

function mapOrder(order: ApiRawOrder): OrderModel {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    total: toNumber(order.total),
    discount: toNumber(order.discount),
    itemsTotal: order.items_total == null ? null : toNumber(order.items_total),
    shippingTotal:
      order.shipping_total == null ? null : toNumber(order.shipping_total),
    note: order.note?.trim() || null,
    createdAt: order.createdAt,
    items: (order.order_item ?? []).map(mapItem),
    images: (order.order_image_confirmed ?? []).map((image) => ({
      id: image.id,
      url: resolveAssetUrl(image.image_url) ?? '',
      note: image.note?.trim() || null,
      replyNote: image.reply_note?.trim() || null,
      status: image.status ?? 'PENDING',
      orderItemId: image.order_item?.id ?? null,
      createdAt: image.createdAt ?? null,
    })),
  };
}

/* ──────────────────────────── Requests ──────────────────────────── */

export async function fetchOrders(
  signal?: AbortSignal,
  client: AxiosInstance = api,
): Promise<OrderModel[]> {
  try {
    const { data } = await client.get<ApiListResponse>('/user/order', { signal });
    return (data.data ?? []).map(mapOrder);
  } catch (error) {
    logApiError('order:list', error);
    throw new Error(toUserMessage(error, 'Gagal memuat daftar pesanan.'));
  }
}

export async function fetchOrderDetail(
  orderId: number,
  signal?: AbortSignal,
  client: AxiosInstance = api,
): Promise<OrderModel> {
  try {
    const { data } = await client.get<ApiDetailResponse>(`/user/order/${orderId}`, {
      signal,
    });
    if (!data.data) throw new Error('Pesanan tidak ditemukan.');
    return mapOrder(data.data);
  } catch (error) {
    logApiError('order:detail', error);
    throw new Error(toUserMessage(error, 'Gagal memuat detail pesanan.'));
  }
}

export interface ConfirmImageInput {
  status: 'CONFIRMED' | 'REJECTED';
  reply_note?: string;
}

/** Setuju/tolak foto buket yang diunggah seller. */
export async function confirmOrderImage(
  imageId: number,
  input: ConfirmImageInput,
  client: AxiosInstance = api,
): Promise<string> {
  try {
    const { data } = await client.patch<{ status: string; message?: string }>(
      `/user/order/image/${imageId}/confirm`,
      input,
    );
    return data.message ?? 'Foto buket berhasil diproses.';
  } catch (error) {
    logApiError('order:confirm-image', error);
    throw new Error(toUserMessage(error, 'Gagal memproses foto buket.'));
  }
}

export type BuyerOrderItemStatus =
  | 'CONFIRM_RECEIVED'
  | 'PROSES_PENGERJAAN'
  | 'DITERIMA';

/**
 * `PATCH /user/order/:orderItemId/status` — aksi pembeli pada satu item.
 * Backend memakai `ORDER_ITEM.id`, jadi UI wajib mengirim id item (bukan id
 * order) dan memilih item yang fotonya sedang menunggu konfirmasi.
 */
export async function updateOrderItemStatus(
  orderItemId: number,
  status: BuyerOrderItemStatus,
  replyNote?: string,
  client: AxiosInstance = api,
): Promise<string> {
  try {
    const { data } = await client.patch<{ status: string; message?: string }>(
      `/user/order/${orderItemId}/status`,
      { status, reply_note: replyNote },
    );
    return data.message ?? 'Status pesanan diperbarui.';
  } catch (error) {
    logApiError('order:item-status', error);
    throw new Error(toUserMessage(error, 'Gagal memperbarui status pesanan.'));
  }
}
