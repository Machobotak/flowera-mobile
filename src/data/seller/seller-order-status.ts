/**
 * Aturan tampilan & transisi status pesanan untuk Seller Center.
 *
 * Sumber kebenaran transisi: `SELLER_TRANSITIONS` di
 * `flowera-api/src/seller/order/order.service.ts`. Peta web
 * (`utils/order-utils.ts`) sudah usang (PROSES_PENGERJAAN → DELIVERY),
 * jadi yang dipakai di sini adalah versi backend yang berjalan.
 *
 * Label & warna badge memakai peta pembeli (`src/data/order/order-status.ts`)
 * supaya status yang sama tampil sama di kedua sisi.
 */

import type MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';

import {
  getOrderStatusStyle,
  type StatusStyle,
} from '@/data/order/order-status';
import type { SellerOrder } from '@/data/seller/seller-order-api';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

/* ──────────────────────────── Transisi ──────────────────────────── */

const TRANSITIONS: Record<string, string[]> = {
  PAID: ['CONFIRM_SELLER'],
  CONFIRM_SELLER: ['PROSES_PENGERJAAN'],
  PROSES_PENGERJAAN: ['CONFIRM_USER'],
  CONFIRM_USER: [],
  CONFIRM_RECEIVED: ['DELIVERY'],
  DELIVERY: [],
  DITERIMA: [],
};

const TRANSITION_META: Record<string, { label: string; icon: IconName }> = {
  CONFIRM_SELLER: { label: 'Konfirmasi Pesanan', icon: 'check-circle' },
  PROSES_PENGERJAAN: { label: 'Mulai Pengerjaan', icon: 'handyman' },
  CONFIRM_USER: { label: 'Minta Konfirmasi Buyer', icon: 'photo-library' },
  DELIVERY: { label: 'Kirim Pesanan', icon: 'local-shipping' },
};

export interface SellerTransitionAction {
  status: string;
  label: string;
  icon: IconName;
}

/** Aksi status berikutnya yang diizinkan backend. */
export function getSellerTransitions(status: string): SellerTransitionAction[] {
  return (TRANSITIONS[status] ?? []).map((target) => ({
    status: target,
    label: TRANSITION_META[target]?.label ?? target,
    icon: TRANSITION_META[target]?.icon ?? 'arrow-forward',
  }));
}

/** Backend hanya menerima foto buket saat pesanan sedang dikerjakan. */
export function canUploadProof(status: string): boolean {
  return status === 'PROSES_PENGERJAAN';
}

/**
 * Keterangan tambahan di bawah aksi, membantu seller paham urutan kerja:
 * unggah foto dulu, baru minta konfirmasi pembeli.
 */
export function getSellerStatusHint(status: string): string | null {
  if (status === 'PROSES_PENGERJAAN') {
    return 'Unggah foto buket dulu, baru minta konfirmasi pembeli.';
  }
  if (status === 'CONFIRM_USER') {
    return 'Menunggu pembeli menyetujui foto buket.';
  }
  if (status === 'CONFIRM_RECEIVED') {
    return 'Foto disetujui pembeli. Lanjut kirim pesanan.';
  }
  return null;
}

export function getSellerStatusStyle(status: string): StatusStyle {
  return getOrderStatusStyle(status);
}

/* ──────────────────────────── Statistik ──────────────────────────── */

/** Pesanan yang butuh aksi seller (padanan web: `ACTIVE_STATUSES`). */
const ACTIVE_STATUSES = ['CONFIRM_SELLER', 'PROSES_PENGERJAAN', 'DELIVERY'];

/** Status yang dihitung sebagai pendapatan (padanan web `REVENUE_STATUSES`). */
const REVENUE_STATUSES = [
  'PAID',
  'CONFIRM_SELLER',
  'PROSES_PENGERJAAN',
  'CONFIRM_USER',
  'DELIVERY',
  'DITERIMA',
];

export interface SellerStats {
  newOrders: number;
  activeOrders: number;
  productCount: number;
  revenue: number;
}

export function computeSellerStats(
  orders: SellerOrder[],
  productCount: number,
): SellerStats {
  return {
    newOrders: orders.filter((order) => order.status === 'PAID').length,
    activeOrders: orders.filter((order) => ACTIVE_STATUSES.includes(order.status))
      .length,
    productCount,
    revenue: orders
      .filter((order) => REVENUE_STATUSES.includes(order.status))
      .reduce((sum, order) => sum + order.total, 0),
  };
}
