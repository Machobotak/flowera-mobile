/**
 * Service checkout Flowera API — padanan `utils/checkout-api.ts` +
 * `utils/checkout-payload.ts` web, ditulis ulang dari kontrak backend:
 *
 *   POST /api/user/order/shipping-options → **array tanpa envelope**
 *        `[{ store_id, weight, shipping: ShippingCostResponse[] }]`
 *   POST /api/user/order/checkout-preview
 *        `{ status, data: { items, shipping_options, summary: {
 *           items_total, service_fee, discount, estimated_total } } }`
 *        (TIDAK ada `stores`/`grand_total` seperti tipe web — grand total
 *        final = estimated_total + ongkir pilihan per toko)
 *   POST /api/user/order/checkout
 *        `{ status, message, data: { order_id, order_number, payment:
 *           { transaction_id, status, qr_url, qr_string, expired_at },
 *           summary: { items_total, shipping_total, service_fee, discount, total } } }`
 *
 * Catatan backend `src/user/order/order.service.ts`:
 *   - `price`, `courier_*`, `shipping_cost` pada `order_items` tidak dipakai
 *     untuk menghitung harga (harga dihitung dari PRODUCT/PRODUCT_VARIANT +
 *     addon), tetapi tetap dikirim agar kontrak sama dengan web.
 *   - `shipping[]` (satu entri per toko) dipakai untuk `shipping_total`, jadi
 *     total yang dibayar harus sama dengan estimasi yang ditampilkan.
 *   - Alamat & toko wajib punya `zip_code`, kalau tidak backend membalas 400.
 */

import type { AxiosInstance } from 'axios';

import { api } from '@/data/api/client';
import { logApiError, toUserMessage } from '@/data/api/errors';

/* ──────────────────────────── Model UI ──────────────────────────── */

export interface CheckoutItemInput {
  productId: number;
  variantId: number | null;
  quantity: number;
  storeId: number;
  weightGram: number;
  /** Harga satuan termasuk addon (hanya informasi, backend menghitung ulang). */
  price: number;
  addons: { title: string; price: number }[];
}

export interface ShippingOption {
  storeId: number;
  courierName: string;
  courierCode: string;
  courierService: string;
  cost: number;
  etd: string;
}

export interface StoreShippingOptions {
  storeId: number;
  weight: number;
  options: ShippingOption[];
}

export interface CheckoutPreview {
  itemsTotal: number;
  serviceFee: number;
  discount: number;
  estimatedTotal: number;
  shippingOptions: StoreShippingOptions[];
}

export interface CreatedOrder {
  orderId: number;
  orderNumber: string;
  payment: {
    transactionId: string | null;
    status: string | null;
    qrUrl: string | null;
    qrString: string | null;
    expiredAt: string | null;
  };
  summary: {
    itemsTotal: number;
    shippingTotal: number;
    serviceFee: number;
    discount: number;
    total: number;
  };
}

/* ──────────────────────────── Raw response ──────────────────────────── */

interface ApiShippingCost {
  name: string;
  code: string;
  service: string;
  description?: string;
  cost: number;
  etd: string;
}

interface ApiStoreShipping {
  store_id: number;
  weight: number;
  shipping?: ApiShippingCost[] | null;
}

interface ApiSummaryPreview {
  items_total: number;
  service_fee: number;
  discount: number;
  estimated_total: number;
}

interface ApiPreviewResponse {
  status: string;
  data: {
    summary: ApiSummaryPreview;
    shipping_options?: ApiStoreShipping[] | null;
  } | null;
}

interface ApiCheckoutResponse {
  status: string;
  message?: string;
  data: {
    order_id: number;
    order_number: string;
    payment: {
      transaction_id?: string | null;
      status?: string | null;
      qr_url?: string | null;
      qr_string?: string | null;
      expired_at?: string | null;
    };
    summary: {
      items_total: number;
      shipping_total: number;
      service_fee: number;
      discount: number;
      total: number;
    };
  } | null;
}

/* ──────────────────────────── Payload builders ──────────────────────────── */

function addonPayload(addons: CheckoutItemInput['addons']): string | undefined {
  if (addons.length === 0) return undefined;
  return JSON.stringify(addons.map((addon) => ({ name: addon.title, price: addon.price })));
}

export function buildOrderItemsPayload(
  items: CheckoutItemInput[],
  selectedShipping: Record<number, ShippingOption>,
) {
  return items.map((item) => {
    const shipping = selectedShipping[item.storeId];

    return {
      product_id: item.productId,
      product_variant_id: item.variantId ?? undefined,
      quantity: item.quantity,
      weight_gram: item.weightGram,
      store_id: item.storeId,
      price: item.price,
      addon_product: addonPayload(item.addons),
      courier_name: shipping?.courierName ?? '-',
      courier_service: shipping?.courierService ?? '-',
      shipping_etd: shipping?.etd ?? '-',
      shipping_cost: shipping?.cost ?? 0,
    };
  });
}

/** Backend menyimpan satu string kurir; web menggabung kode unik dengan ':'. */
export function buildCourierString(
  selectedShipping: Record<number, ShippingOption>,
): string {
  const codes = Object.values(selectedShipping)
    .map((option) => option.courierCode)
    .filter(Boolean);

  return [...new Set(codes)].join(':') || 'placeholder';
}

export function buildShippingArray(
  selectedShipping: Record<number, ShippingOption>,
) {
  return Object.values(selectedShipping).map((option) => ({
    store_id: option.storeId,
    courier_name: option.courierName,
    courier_code: option.courierCode,
    courier_service: option.courierService,
    shipping_cost: option.cost,
    shipping_etd: option.etd,
  }));
}

export function shippingTotalOf(
  selectedShipping: Record<number, ShippingOption>,
): number {
  return Object.values(selectedShipping).reduce(
    (sum, option) => sum + option.cost,
    0,
  );
}

/* ──────────────────────────── Mapper ──────────────────────────── */

function mapShippingOptions(stores?: ApiStoreShipping[] | null): StoreShippingOptions[] {
  return (stores ?? []).map((store) => ({
    storeId: store.store_id,
    weight: store.weight,
    options: (store.shipping ?? []).map((option) => ({
      storeId: store.store_id,
      courierName: option.name,
      courierCode: option.code,
      courierService: option.service,
      cost: option.cost,
      etd: option.etd,
    })),
  }));
}

function basePayload(
  addressId: number,
  items: CheckoutItemInput[],
  selectedShipping: Record<number, ShippingOption>,
  note?: string,
) {
  return {
    address_id: addressId,
    discount: 0,
    courier: buildCourierString(selectedShipping),
    note,
    shipping: buildShippingArray(selectedShipping),
    order_items: buildOrderItemsPayload(items, selectedShipping),
  };
}

/* ──────────────────────────── Requests ──────────────────────────── */

/**
 * `POST /user/order/shipping-options` — ongkir per toko dari RajaOngkir.
 * Response berupa array polos (tanpa `status`/`data`).
 */
export async function fetchShippingOptions(
  addressId: number,
  items: CheckoutItemInput[],
  signal?: AbortSignal,
  client: AxiosInstance = api,
): Promise<StoreShippingOptions[]> {
  try {
    const { data } = await client.post<ApiStoreShipping[]>(
      '/user/order/shipping-options',
      {
        address_id: addressId,
        courier: 'placeholder',
        shipping: [],
        order_items: buildOrderItemsPayload(items, {}),
      },
      { signal },
    );

    return mapShippingOptions(data);
  } catch (error) {
    logApiError('order:shipping-options', error);
    throw new Error(
      toUserMessage(error, 'Gagal menghitung ongkos kirim untuk alamat ini.'),
    );
  }
}

/** `POST /user/order/checkout-preview` — verifikasi harga sebelum bayar. */
export async function previewCheckout(
  addressId: number,
  items: CheckoutItemInput[],
  selectedShipping: Record<number, ShippingOption>,
  note?: string,
  signal?: AbortSignal,
  client: AxiosInstance = api,
): Promise<CheckoutPreview> {
  try {
    const { data } = await client.post<ApiPreviewResponse>(
      '/user/order/checkout-preview',
      basePayload(addressId, items, selectedShipping, note),
      { signal },
    );

    if (!data.data) {
      throw new Error('Ringkasan pesanan tidak tersedia.');
    }

    return {
      itemsTotal: data.data.summary.items_total,
      serviceFee: data.data.summary.service_fee,
      discount: data.data.summary.discount,
      estimatedTotal: data.data.summary.estimated_total,
      shippingOptions: mapShippingOptions(data.data.shipping_options),
    };
  } catch (error) {
    logApiError('order:checkout-preview', error);
    throw new Error(toUserMessage(error, 'Gagal memverifikasi pesanan.'));
  }
}

/** `POST /user/order/checkout` — membuat order + pembayaran QRIS Midtrans. */
export async function placeOrder(
  addressId: number,
  items: CheckoutItemInput[],
  selectedShipping: Record<number, ShippingOption>,
  note?: string,
  client: AxiosInstance = api,
): Promise<CreatedOrder> {
  try {
    const { data } = await client.post<ApiCheckoutResponse>(
      '/user/order/checkout',
      { ...basePayload(addressId, items, selectedShipping, note), paymentMethod: 'QRIS' },
    );

    if (!data.data) {
      throw new Error('Pesanan tidak berhasil dibuat.');
    }

    const { payment, summary } = data.data;

    return {
      orderId: data.data.order_id,
      orderNumber: data.data.order_number,
      payment: {
        transactionId: payment.transaction_id ?? null,
        status: payment.status ?? null,
        qrUrl: payment.qr_url ?? null,
        qrString: payment.qr_string ?? null,
        expiredAt: payment.expired_at ?? null,
      },
      summary: {
        itemsTotal: summary.items_total,
        shippingTotal: summary.shipping_total,
        serviceFee: summary.service_fee,
        discount: summary.discount,
        total: summary.total,
      },
    };
  } catch (error) {
    logApiError('order:checkout', error);
    throw new Error(toUserMessage(error, 'Gagal membuat pesanan.'));
  }
}
