/**
 * Status pesanan Flowera — padanan `utils/order-utils.ts` web, disesuaikan
 * dengan nilai yang benar-benar ditulis backend `flowera-api`:
 *   ORDER.status        : UNPAID → PAID → CONFIRM_SELLER → PROSES_PENGERJAAN
 *                         → CONFIRM_USER → DELIVERY → DITERIMA
 *                         (+ EXPIRED / CANCELLED / FAILED dari sync Midtrans)
 *   ORDER_ITEM.status   : transisi pembeli (`CONFIRM_USER`, `DELIVERY`)
 *   ORDER_IMAGE_CONFIRMED.status : PENDING → CONFIRMED | REJECTED
 */

import { Colors } from '@/constants/theme';

/** Sama dengan `SERVICE_FEE` di `src/user/order/order.service.ts`. */
export const SERVICE_FEE = 1000;

export interface StatusStyle {
  label: string;
  background: string;
  foreground: string;
}

const STATUS_STYLES: Record<string, StatusStyle> = {
  UNPAID: {
    label: 'Menunggu Pembayaran',
    background: Colors.tertiaryContainer,
    foreground: '#4a3b00',
  },
  PAID: {
    label: 'Sudah Dibayar',
    background: Colors.errorContainer,
    foreground: Colors.error,
  },
  CONFIRM_SELLER: {
    label: 'Dikonfirmasi Penjual',
    background: Colors.primaryContainer,
    foreground: Colors.onPrimaryContainer,
  },
  PROSES_PENGERJAAN: {
    label: 'Sedang Dikerjakan',
    background: Colors.tertiaryContainer,
    foreground: '#4a3b00',
  },
  CONFIRM_USER: {
    label: 'Menunggu Konfirmasi',
    background: Colors.errorContainer,
    foreground: Colors.error,
  },
  CONFIRM_RECEIVED: {
    label: 'Sudah Dikonfirmasi',
    background: Colors.secondaryContainer,
    foreground: Colors.secondary,
  },
  DELIVERY: {
    label: 'Dalam Pengiriman',
    background: Colors.secondaryContainer,
    foreground: Colors.secondary,
  },
  DITERIMA: {
    label: 'Pesanan Diterima',
    background: Colors.secondaryContainer,
    foreground: Colors.secondary,
  },
  EXPIRED: {
    label: 'Kedaluwarsa',
    background: Colors.surfaceContainerHigh,
    foreground: Colors.onSurfaceVariant,
  },
  CANCELLED: {
    label: 'Dibatalkan',
    background: Colors.surfaceContainerHigh,
    foreground: Colors.onSurfaceVariant,
  },
  FAILED: {
    label: 'Pembayaran Gagal',
    background: Colors.errorContainer,
    foreground: Colors.error,
  },
};

const DEFAULT_STATUS_STYLE: StatusStyle = {
  label: 'Status Tidak Diketahui',
  background: Colors.surfaceContainerHigh,
  foreground: Colors.onSurfaceVariant,
};

export function getOrderStatusStyle(status: string): StatusStyle {
  return STATUS_STYLES[status] ?? { ...DEFAULT_STATUS_STYLE, label: status };
}

/** Label status untuk badge pesanan pembeli. */
export function getBuyerStatusLabel(status: string): string {
  return getOrderStatusStyle(status).label;
}

/* ──────────────────────────── Filter pesanan ──────────────────────────── */

export type OrderFilterKey =
  | 'all'
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'completed'
  | 'cancelled';

export const ORDER_FILTERS: { key: OrderFilterKey; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'pending', label: 'Belum Bayar' },
  { key: 'paid', label: 'Dibayar' },
  { key: 'processing', label: 'Diproses' },
  { key: 'shipped', label: 'Dikirim' },
  { key: 'completed', label: 'Selesai' },
  { key: 'cancelled', label: 'Batal' },
];

/** Padanan `getBuyerFilterKey` web (dipakai untuk tab filter). */
export function getBuyerFilterKey(status: string): OrderFilterKey {
  const map: Record<string, OrderFilterKey> = {
    UNPAID: 'pending',
    PAID: 'paid',
    CONFIRM_SELLER: 'processing',
    PROSES_PENGERJAAN: 'processing',
    CONFIRM_USER: 'processing',
    CONFIRM_RECEIVED: 'processing',
    DELIVERY: 'shipped',
    DITERIMA: 'completed',
    SHIPPED: 'shipped',
    DELIVERED: 'completed',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    EXPIRED: 'cancelled',
    FAILED: 'cancelled',
  };

  return map[status] ?? 'processing';
}

/* ──────────────────────────── Timeline ──────────────────────────── */

export const TIMELINE_STEPS = [
  'Diterima',
  'Diproses',
  'Dikirim',
  'Terkirim',
] as const;

/**
 * 0 = pesanan baru, 4 = selesai. Nilai 4 menandai semua langkah selesai
 * (web memakai angka yang sama untuk progress bar-nya).
 */
export function getTimelineStep(status: string): number {
  const map: Record<string, number> = {
    UNPAID: 0,
    PAID: 1,
    CONFIRM_SELLER: 2,
    PROSES_PENGERJAAN: 2,
    CONFIRM_USER: 2,
    CONFIRM_RECEIVED: 2,
    DELIVERY: 3,
    DITERIMA: 4,
    SHIPPED: 3,
    DELIVERED: 4,
    COMPLETED: 4,
    CANCELLED: 0,
    EXPIRED: 0,
    FAILED: 0,
  };

  return map[status] ?? 0;
}

/** Status akhir yang tidak butuh aksi pembeli lagi. */
export function isOrderFinished(status: string): boolean {
  return (
    status === 'DITERIMA' ||
    status === 'COMPLETED' ||
    status === 'DELIVERED' ||
    status === 'CANCELLED' ||
    status === 'EXPIRED' ||
    status === 'FAILED'
  );
}

/**
 * Ongkos layanan dari field order (`total - items - shipping + discount`),
 * fallback ke konstanta. Sama dengan `deriveServiceFee` web.
 */
export function deriveServiceFee(order: {
  total?: number | null;
  items_total?: number | null;
  shipping_total?: number | null;
  discount?: number | null;
}): number {
  if (
    order.total != null &&
    order.items_total != null &&
    order.shipping_total != null
  ) {
    const fee =
      order.total - order.items_total - order.shipping_total + (order.discount ?? 0);
    return fee > 0 ? fee : SERVICE_FEE;
  }

  return SERVICE_FEE;
}
